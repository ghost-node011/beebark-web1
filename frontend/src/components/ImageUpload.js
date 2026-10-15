import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { FiUpload, FiX } from 'react-icons/fi';
import { IMAGE_FORMAT_ERROR, imageFileError, uploadImage, uploadImages, failedSummary } from '../lib/imageUpload';

const ImageUpload = ({ onUploadComplete, multiple = false, endpoint }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    if (!multiple) setPreview(URL.createObjectURL(acceptedFiles[0]));
    try {
      if (multiple) {
        const { uploaded, failed } = await uploadImages(acceptedFiles);
        if (uploaded.length) onUploadComplete(uploaded.map(({ url }) => ({ url })));
        if (failed.length) toast.error(failedSummary(failed, acceptedFiles.length), { duration: 8000 });
        else toast.success('Image uploaded successfully!');
      } else {
        onUploadComplete(await uploadImage(acceptedFiles[0], endpoint ? { endpoint } : undefined));
        toast.success('Image uploaded successfully!');
      }
    } catch (error) {
      setPreview(null);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  }, [multiple, onUploadComplete, endpoint]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Wrong format or too big: say so instead of silently ignoring the file
    onDropRejected: (rejections) => toast.error(imageFileError(rejections[0]?.file) || IMAGE_FORMAT_ERROR),
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'], 'image/gif': ['.gif'], 'image/webp': ['.webp']
    },
    multiple,
    maxSize: 18 * 1024 * 1024
  });

  const clearPreview = () => {
    setPreview(null);
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-yellow-500 bg-yellow-50' : 'border-slate-300 hover:border-yellow-400'
        }`}
        data-testid="image-upload-dropzone"
      >
        <input {...getInputProps()} />
        <FiUpload className="w-10 h-10 mx-auto mb-2 text-slate-400" />
        <p className="text-sm text-slate-600">
          {isDragActive ? 'Drop the image here' : 'Drag & drop or click to upload'}
        </p>
        <p className="text-xs text-slate-500 mt-1">Max 18MB • JPG, PNG, GIF, WebP</p>
        {uploading && (
          <div className="mt-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="text-sm text-slate-600 mt-2">Uploading...</p>
          </div>
        )}
      </div>

      {preview && (
        <div className="relative inline-block">
          <img src={preview} alt="Preview" className="h-32 w-32 object-cover rounded-lg" />
          <button
            onClick={clearPreview}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;