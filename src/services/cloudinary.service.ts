// src/services/cloudinary.service.ts
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';

export const uploadToCloudinary = (fileBuffer: Buffer, folder: string = 'dinedesk'): Promise<string> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
                if (error) return reject(error);
                if (result) resolve(result.secure_url);
                else reject(new Error('Cloudinary upload failed with no result.'));
            }
        );

        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};