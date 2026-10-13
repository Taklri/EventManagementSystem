import multer from "multer";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 4 },
});

export const attendancePhotoUpload = (req, res, next) => {
  upload.single("photo")(req, res, (error) => {
    if (!error) return next();
    const oversized = error.code === "LIMIT_FILE_SIZE";
    return res.status(oversized ? 413 : 400).json({
      message: oversized
        ? "Attendance photo must be 5 MB or smaller"
        : "Invalid attendance photo upload",
      field: "photo",
    });
  });
};
