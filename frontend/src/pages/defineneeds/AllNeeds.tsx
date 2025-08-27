import { useState } from "react";
import UploadFile from "./FileUpload";
import useAppStore from "@/stores/useAppStore";
import Loading from "@/components/ui/Loading";
import { useNavigate, useParams } from "react-router-dom";
import { useGenerate, useGenerateStore } from "@/api/useGenerate";
import useHistoryStore from "@/stores/useHistoryStore";
import pencilIcon from "../../assets/icon/pencil.png";
import downloadIcon from "../../assets/icon/download.png";
import timeIcon from "../../assets/icon/timer.png";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import InputArea from "./InputArea";

export default function AllNeeds() {
  const { setUploadedFiles, uploadedFiles, codingButtonStatus } = useAppStore();
  const { project } = useParams();
  const navigate = useNavigate();
  const [hasNoData, setHasNoData] = useState(() => {
    return uploadedFiles?.length === 0 || !uploadedFiles;
  });
  const { hasFullGenerated, handleGenerate, loading, progress, generatePDF } =
    useGenerate();
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");

  const handleFilesUpload = (files: File[]) => {
    // console.log("Files uploaded:", files);
    setUploadedFiles(files);
    setHasNoData(false);
  };

  // const handleEditDefaultSettings = () => {
  //   navigate("customize");
  // };

  const showCustomAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 2000);
  };

  const handleGenerateClick = async () => {
    if (hasNoData) {
      showCustomAlert(
        "Action Required",
        "Please upload your data first before accessing reasoning."
      );
      return;
    } else {
      useGenerateStore.getState().setHasFullGenerated(false);
      await handleGenerate();
    }

    if (generatePDF) {
      try {
        await generatePDF();
        if (project) {
          navigate(`/defineneeds/${project}/0`);
        }
      } catch (error) {
        console.error("Error generating PDF after analysis:", error);
      }
    }

    setHasNoData(false);
  };

  const handleReasoning = () => {
    // Check if data exists before navigating
    if (hasNoData) {
      showCustomAlert(
        "Action Required",
        "Please upload your data first before accessing reasoning."
      );
    } else if (!hasFullGenerated) {
      showCustomAlert(
        "Processing Required",
        "Please wait for the full generation to complete before accessing reasoning."
      );
    } else {
      const urlParts = window.location.hash.split("/");
      const project = urlParts.length > 2 ? urlParts[2] : "default";
      const step = urlParts.length > 3 ? urlParts[3] : "1";

      navigate(`/progress/${project}/${step}`);
    }
  };

  const handleViewDownload = () => {
    // Check if data exists before generating PDF
    if (hasNoData) {
      showCustomAlert(
        "Action Required",
        "Please upload your data first before downloading."
      );
    } else if (!hasFullGenerated) {
      showCustomAlert(
        "Processing Required",
        "Please start coding before downloading."
      );
    } else {
      // Check if we already have a PDF in history for this session
      const { history } = useHistoryStore.getState();

      // Debug the history state
      console.log("History entries when viewing:", history.length);

      if (history.length > 0 && history[0].pdfData) {
        // View the PDF in a new tab
        openPdfInNewTab(history[0]);
      } else if (generatePDF) {
        // Otherwise generate a new PDF
        generatePDF().then((success) => {
          if (success) {
            // After generating, view it
            const { history } = useHistoryStore.getState();
            if (history.length > 0 && history[0].pdfData) {
              openPdfInNewTab(history[0]);
            }
          }
        });
      }
    }
  };

  // Helper function to open PDF in a new tab
  const openPdfInNewTab = (entry: any) => {
    // Create a blob from the base64 data
    const binaryString = window.atob(
      entry.pdfData.replace(/^data:application\/pdf;base64,/, "")
    );
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Open the PDF in a new tab
    window.open(url, "_blank");

    // Clean up the URL object when the tab is closed (after a reasonable time)
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000); // Revoke after 1 minute
  };

  const handleVersionHistory = () => {
    // Check if history exists before opening the modal
    const { checkHistoryExists, setShowHistoryModal, history } =
      useHistoryStore.getState();

    // Debug the history state
    console.log("History exists:", checkHistoryExists());
    console.log("History entries:", history.length);

    if (history.length > 0) {
      setShowHistoryModal(true);
    } else {
      showCustomAlert("No History", "No previous PDF found");
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-auto scrollbar-thin">
      {showAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-80">
          <Alert
            variant="default"
            className="bg-white border-[#CB9180] shadow-md"
          >
            <AlertTitle className="text-[#CB9180]">{alertTitle}</AlertTitle>
            <AlertDescription>{alertMessage}</AlertDescription>
          </Alert>
        </div>
      )}
      <div className="flex-1 flex flex-col gap-2 pb-4">
        <div className="flex flex-row h-54 py-2 justify-start gap-36 items-center px-8 bg-[#FFFBF9] shadow-[4px_0px_20px_0px_rgba(0,0,0,0.25)] rounded-xl">
          <h1 className="font-zen text-[96px] text-[#0000001F]">1</h1>
          <p className="font-zen text-lg items-center justify-center w-[450px]">
            Upload your qualitative data in .txt or .docx format. Note that your data will be sent to OpenAI’s GPT-5 model, please remove any personal identification information before uploading.
          </p>
          <UploadFile onFilesUpload={handleFilesUpload} />
        </div>

        {/* Step 2 - Define how to code */}
        <div className="flex flex-row h-54 py-2 justify-start gap-36 items-center px-8 bg-[#FFFBF9] shadow-[4px_0px_20px_0px_rgba(0,0,0,0.25)] rounded-xl">
          <h1 className="font-zen text-[96px] text-[#0000001F]">2</h1>
          {/* <p className="font-zen text-lg font-semibold items-center justify-center w-[240px] mr-20">
            Define how to code
          </p> */}
          {/* <button
            onClick={handleEditDefaultSettings}
            className={`px-4 py-2 rounded-md text-white focus:ring-2 ${
              codingButtonStatus ? "bg-[#6EDE80]" : "bg-[#CB9180]"
            }`}
          >
            {codingButtonStatus
              ? "Saved customization"
              : "Edit Default Setting"}
          </button> */}
          <InputArea />
        </div>

        {/* Input Area */}
        {/* {showInputArea && (
          <div className="mt-4">
            <InputArea onInputChange={handleInputChange} />
          </div>
        )} */}

        {/* Step 3 - Generate analysis */}
        <div className="flex flex-row h-54 py-2 justify-start gap-36 items-center px-8 bg-[#FFFBF9] shadow-[4px_0px_20px_0px_rgba(0,0,0,0.25)] rounded-xl">
          <h1 className="font-zen text-[96px] text-[#0000001F]">3</h1>
          <p className="font-zen text-lg items-center justify-center w-[240px] mr-28">
            Perform coding
          </p>

          <button
            onClick={handleGenerateClick}
            className={`px-4 py-2 rounded-md text-white focus:ring-2 ${
              hasFullGenerated ? "bg-[#6EDE80]" : "bg-[#CB9180]"
            }`}
          >
            {hasFullGenerated ? "Success & Regenerate" : "Start Coding"}
          </button>
        </div>

        <div className="flex justify-around mt-2">
          <button
            onClick={handleViewDownload}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-[#CB9180] text-white hover:bg-[#AA7667] font-semibold"
          >
            <img src={downloadIcon} alt="Download" className="w-5 h-5" />
            View & Download
          </button>

          <button
            onClick={handleReasoning}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-[#CB9180] text-white hover:bg-[#AA7667] font-semibold"
          >
            <img src={pencilIcon} alt="Reasoning" className="w-5 h-5" />
            Reasoning
          </button>
          {loading && <Loading progress={progress} />}
          <button
            onClick={handleVersionHistory}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-[#CB9180] text-white hover:bg-[#AA7667] font-semibold"
          >
            <img src={timeIcon} alt="History" className="w-5 h-5" />
            Version History
          </button>
        </div>
      </div>
    </div>
  );
}
