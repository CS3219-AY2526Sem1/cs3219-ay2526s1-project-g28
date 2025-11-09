// server/cloudinary-signature.js
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({ secure: true }); // reads CLOUDINARY_URL automatically

export function getUploadSignature(params = {}) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = params.folder || "avatars";
  // Any extra params you want locked in the signature go here:
  const toSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(
    toSign,
    cloudinary.config().api_secret
  );
  return {
    timestamp,
    folder,
    signature,
    cloudName: cloudinary.config().cloud_name,
    apiKey: cloudinary.config().api_key,
  };
}
