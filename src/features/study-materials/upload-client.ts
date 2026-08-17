/**
 * Uploads a file directly to Supabase Storage's signed-upload endpoint from
 * the browser (never through our own server — Vercel's serverless request
 * body cap is well under the material size limit). Raw XHR rather than the
 * Storage SDK's `uploadToSignedUrl` (fetch-based) so we get real byte-level
 * progress events for the upload UI.
 */
export function uploadFileWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", file);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`upload failed with status ${xhr.status}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("upload failed")));
    xhr.addEventListener("abort", () => reject(new Error("upload aborted")));

    xhr.open("POST", signedUrl);
    xhr.send(formData);
  });
}
