import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadExampleImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image required (field name: "image")' });
    }

    const allowed = ['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/svg+xml'];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ message: `Unsupported image type: ${req.file.mimetype}` });
    }

    const result = await new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: 'questions', resource_type: 'image' },
        (err, r) => (err ? reject(err) : resolve(r))
      );
      streamifier.createReadStream(req.file.buffer).pipe(upload);
    });

    return res.status(200).json({
      message: 'Uploaded image',
      data: {
        url: result.secure_url,
        provider: 'cloudinary',
        key: result.public_id,
        width: result.width,
        height: result.height,
        mime: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    return res.status(500).json({ message: 'Upload failed' });
  }
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

export const sanitizeExamplesForSave = (examples = []) =>
  (Array.isArray(examples) ? examples : []).map((ex) => {
    const img = ex?.image && typeof ex.image === 'object' ? ex.image : null;
    const image =
      img && img.url
        ? {
            url: img.url,
            provider: img.provider || 'cloudinary',
            key: img.key,
            width: img.width,
            height: img.height,
            mime: img.mime,
            size: img.size,
          }
        : undefined;

    return {
      input: ex.input,
      output: ex.output,
      explanation: ex.explanation,
      image,
    };
  });

export const collectImageKeys = (examples = []) =>
  (Array.isArray(examples) ? examples : [])
    .map((ex) => ex?.image?.key)
    .filter(Boolean);

export const destroyCloudinaryKeys = async (keys = []) => {
  for (const key of keys) {
    try {
      await cloudinary.uploader.destroy(key);
    } catch (e) {
      console.warn('Cloudinary destroy failed:', key, e?.message);
    }
  }
};