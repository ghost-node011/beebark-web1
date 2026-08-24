import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { FiUpload, FiX } from 'react-icons/fi';
import { API_URL } from '../config/api';

const ImageUpload = ({ onUploadComplete, multiple = false, endpoint }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    if (multiple) {
      acceptedFiles.forEach(file => {
        formData.append('images', file);
      });
    } else {
      formData.append('image', acceptedFiles[0]);
      setPreview(URL.createObjectURL(acceptedFiles[0]));
    }

    try {
      const targetEndpoint = endpoint || (multiple ? '/api/upload/multiple' : '/api/upload/image');
      const response = await axios.post(`${API_URL}${targetEndpoint}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (multiple) {
        onUploadComplete(response.data.images);
      } else {
        onUploadComplete(response.data.url);
      }
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      setPreview(null);
      toast.error(error.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  }, [multiple, onUploadComplete, endpoint]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
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