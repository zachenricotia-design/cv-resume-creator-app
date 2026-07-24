import crypto from 'node:crypto';
import pool from '../db/pool.js';
import { cleanupTempDirectories } from '../utils/fileCleanup.js';

const escapePdfText = (value = '') =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const buildMinimalPdf = (cvData = {}) => {
  const name = [cvData?.personal?.name, cvData?.personal?.title].filter(Boolean).join(' — ');
  const sections = cvData?.sections || [];
  const lines = [name || 'Resume Preview'];

  sections.forEach((section) => {
    if (Array.isArray(section?.entries) && section.entries.length > 0) {
      lines.push(`Section: ${section.type}`);
      section.entries.slice(0, 3).forEach((entry, index) => {
        lines.push(`${index + 1}. ${entry.title || entry.company || entry.name || JSON.stringify(entry)}`);
      });
    }
  });

  const content = lines
    .map((line, index) => `BT /F1 11 Tf 50 ${730 - index * 18} Td (${escapePdfText(line)}) Tj ET`)
    .join('\n');

  const stream = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  const pdfParts = ['%PDF-1.4'];
  let offset = pdfParts.join('\n').length + 1;

  const objectOffsets = [];
  objects.forEach((object, index) => {
    objectOffsets.push(offset);
    pdfParts.push(`${index + 1} 0 obj\n${object}\nendobj`);
    offset += pdfParts[pdfParts.length - 1].length + 1;
  });

  const xrefOffset = offset;
  pdfParts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  objectOffsets.forEach((offsetValue) => {
    pdfParts.push(`${String(offsetValue).padStart(10, '0')} 00000 n \n`);
  });

  pdfParts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(pdfParts.join('\n'), 'binary');
};

const requireAccess = (cv, token, user) => {
  if (!cv) {
    return { status: 404, message: 'CV not found' };
  }

  if (cv.user_id !== null) {
    if (!user) {
      return { status: 401, message: 'Authentication required to access this CV' };
    }

    if (String(user.id) !== String(cv.user_id)) {
      return { status: 403, message: 'Forbidden: you do not own this CV' };
    }

    return null;
  }

  if (!token) {
    return { status: 401, message: 'Missing CV access token' };
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  if (tokenHash !== cv.access_token_hash) {
    return { status: 403, message: 'Invalid CV access token' };
  }

  return null;
};

export const exportCVPreview = async (req, res, next) => {
  try {
    const pdfBuffer = buildMinimalPdf(req.body);
    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const exportSavedCV = async (req, res, next) => {
  try {
    const { id } = req.params;
    const accessToken = req.header('X-CV-Access-Token');
    const cvResult = await pool.query(
      `SELECT id, user_id, personal_data, sections, access_token_hash FROM cvs WHERE id = $1`,
      [id]
    );

    const cv = cvResult.rows[0] || null;
    const accessError = requireAccess(cv, accessToken, req.user);
    if (accessError) {
      return res.status(accessError.status).json({ error: true, message: accessError.message });
    }

    const pdfBuffer = buildMinimalPdf({ personal: cv.personal_data || {}, sections: cv.sections || [] });
    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${id}.pdf"`);
    res.send(pdfBuffer);

    await cleanupTempDirectories();
  } catch (error) {
    next(error);
  }
};
