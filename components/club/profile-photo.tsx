"use client";
import { useState } from "react";
export function ProfilePhotoInput({ initial = "" }: { initial?: string }) {
  const [photo, setPhoto] = useState(initial),
    [error, setError] = useState("");
  return (
    <div className="profile-photo-field">
      <label>
        Ảnh cá nhân (không bắt buộc)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const input = e.currentTarget,
              file = input.files?.[0];
            setError("");
            if (!file) return;
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > 2 * 1024 * 1024
            ) {
              setError("Chọn ảnh JPG, PNG hoặc WebP, tối đa 2 MB.");
              input.value = "";
              return;
            }
            const reader = new FileReader();
            reader.onload = () => setPhoto(String(reader.result));
            reader.onerror = () =>
              setError("Không đọc được ảnh. Vui lòng chọn lại.");
            reader.readAsDataURL(file);
          }}
        />
      </label>
      <input type="hidden" name="photoData" value={photo} />
      {photo && (
        <div className="photo-preview">
          <img src={photo} alt="Ảnh cá nhân đã chọn" />
          <button
            type="button"
            className="text-link"
            onClick={() => setPhoto("")}
          >
            Bỏ ảnh
          </button>
        </div>
      )}
      <p className="muted footnote">
        Ảnh khuôn mặt giúp BTC nhận diện hồ sơ. Chỉ bạn và ban điều hành xem
        được ảnh này.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
