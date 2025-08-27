import React, { useRef, useState } from "react";
import uploadIcon from "../../assets/upload.png";
import useAppStore from "@/stores/useAppStore";
import mammoth from "mammoth";

interface UploadButtonProps {
  onFilesUpload: (files: File[]) => void;
}

const UploadButton: React.FC<UploadButtonProps> = ({ onFilesUpload }) => {
  const { uploadedFiles, setUploadedFiles } = useAppStore();
  const [showModal, setShowModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedFileTypes = [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((file) =>
      allowedFileTypes.includes(file.type)
    );

    if (validFiles.length < fileArray.length) {
      alert("Please upload only .docx, .txt format files");
    }

    const processedFiles = await Promise.all(
      validFiles.map(async (file) => {
        let textContent = "";
        if (
          file.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/msword"
        ) {
          // Convert DOCX to text
          textContent = await convertDocxToText(file);
          // console.log("Converted Text:", textContent);
          // Create a new Blob with plain text
          const textBlob = new Blob([textContent], { type: "text/plain" });
          return new File([textBlob], `${file.name}.txt`, {
            type: "text/plain",
          });
        } else if (file.type === "text/plain") {
          return file; // If it's already plain text, just return it
        }
      })
    );

    const updatedFiles = [
      ...(Array.isArray(uploadedFiles) ? uploadedFiles : []),
      ...processedFiles,
    ];

    setUploadedFiles(updatedFiles);
    onFilesUpload(updatedFiles);
    // console.log("Uploaded Files: ", updatedFiles);
  };

  const convertDocxToText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.convertToHtml({ arrayBuffer });

    let text = result.value;

    // Convert HTML to plain text while preserving formatting
    text = text
      // Convert paragraphs to double line breaks to maintain spacing
      .replace(/<p[^>]*>/gi, "")
      .replace(/<\/p>/gi, "\n\n")
      // Convert breaks to single line breaks
      .replace(/<br\s*\/?>/gi, "\n")
      // Convert lists
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<\/li>/gi, "\n")
      // Remove all other HTML tags
      .replace(/<[^>]+>/g, "")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      // Preserve multiple spaces
      .replace(/ {2,}/g, (match) => match)
      // Preserve tabs
      .replace(/\t/g, "\t")
      // Normalize line endings
      .replace(/\r\n|\r|\n/g, "\n")
      // Preserve multiple line breaks (3 or more)
      .replace(/\n{3,}/g, (match) => match)
      // Ensure consistent double line breaks between paragraphs
      .replace(/\n\n\n/g, "\n\n")
      // Trim extra whitespace at the end
      .trim();

    return text;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleButtonClick = () => {
    if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      setShowModal(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDelete = (indexToDelete: number) => {
    const updatedFiles = uploadedFiles.filter(
      (_, index) => index !== indexToDelete
    );
    setUploadedFiles(updatedFiles);

    if (updatedFiles.length === 0) {
      setShowModal(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="flex flex-row h-full flex-1 justify-start gap-36 items-center px-8 bg-[#FFFBF9] rounded-xl">
      <div
        className="flex flex-col items-center justify-center border-2 rounded-lg border-dashed border-[#CB9180] bg-[#FFF3EE] border-gray-400 text-center cursor-pointer font-zen w-[300px] h-[150px]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <img src={uploadIcon} className="w-[30px]" />
        <div className="font-zen font-semibold">
          drag and drop your file <br />
          Or
        </div>
        <input
          type="file"
          multiple
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleInputChange}
        />
        <button
          className={`px-4 py-2 rounded text-white focus:ring-2 ${
            Array.isArray(uploadedFiles) && uploadedFiles.length > 0
              ? "bg-[#6EDE80]"
              : "bg-[#CB9180]"
          }`}
          onClick={handleButtonClick}
        >
          {Array.isArray(uploadedFiles) && uploadedFiles.length > 0
            ? "Check Uploaded Files"
            : "Browse Files"}
        </button>
      </div>

      {showModal && Array.isArray(uploadedFiles) && (
        <div className="fixed inset-0 flex items-center font-zen justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-semibold mb-4">Uploaded Files</h2>
            <ul className="mb-4 overflow-auto">
              {uploadedFiles.map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between text-sm gap-3"
                >
                  <span>{file.name}</span>
                  <button
                    className="text-red-500"
                    onClick={() => handleDelete(index)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded bg-gray-300 text-black"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-[#CB9180] text-white"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadButton;
