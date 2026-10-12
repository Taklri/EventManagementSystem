import multer from "multer";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 31, fields: 20 },
});

export const eventImageUpload = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();

  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "speakerImages", maxCount: 30 },
  ])(req, res, (error) => {
    if (!error) {
      req.file = req.files?.coverImage?.[0];
      req.speakerFiles = req.files?.speakerImages || [];
      return next();
    }
    const oversized = error.code === "LIMIT_FILE_SIZE";
    return res.status(oversized ? 413 : 400).json({
      message: oversized ? "Cover image must be 5 MB or smaller" : "Invalid cover image upload",
      field: "coverImage",
    });
  });
};
