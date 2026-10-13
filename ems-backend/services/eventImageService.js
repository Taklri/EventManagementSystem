import { v2 as cloudinary } from "cloudinary";

const cloudinaryConfig = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Image storage is not configured");
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
};

export const uploadEventImage = async (buffer) => {
  cloudinaryConfig();
  const folder = process.env.CLOUDINARY_FOLDER?.trim() || "ems/events";
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => error ? reject(error) : resolve({
        imageUrl: result.secure_url,
        imagePublicId: result.public_id,
      }),
    );
    stream.on("error", reject);
    stream.end(buffer);
  });
};

export const removeEventImage = async (publicId) => {
  cloudinaryConfig();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
};

export const uploadProfileImage = async (buffer) => {
  cloudinaryConfig();
  const folder = process.env.CLOUDINARY_PROFILE_FOLDER?.trim() || "ems/profiles";
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => error ? reject(error) : resolve({
        imageUrl: result.secure_url,
        imagePublicId: result.public_id,
      }),
    );
    stream.on("error", reject);
    stream.end(buffer);
  });
};

export const removeProfileImage = async (publicId) => removeEventImage(publicId);
