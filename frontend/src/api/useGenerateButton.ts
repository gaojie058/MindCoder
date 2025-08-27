import { useState } from "react";
import axios from "axios";
import { buttonPromptTemplates } from "./buttonPromptTemplates";
import { API_URL } from "./api";

export function useGenerateButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formData = new FormData();

  const generateName = async (
    selectedItems: string[],
    data: any[],
    type: "code" | "concept" | "conceptdefinition" | "codedefinition"
  ) => {
    if (selectedItems.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);


    try {
      let selectedData: any;
      const formattedSelectedData = {};

      switch (type) {
        case "code": {
          selectedData = selectedItems
            .map((itemId) => data.find((item) => item.id === itemId))
            .filter((item) => item !== undefined);


          selectedData.forEach((item, index) => {
            const clusterKey = `Open Code ${item.id || index + 1}`;
            const chunks = item.topics.map(topic => topic.content);

            formattedSelectedData[clusterKey] = {
              name: item.name,
              chunks: chunks
            };
          });


          // console.log("😎😎😎😎😎Check Formatted Selected Data:", JSON.stringify(formattedSelectedData, null, 2))

          break;
        }

        case "concept": {
          selectedData = selectedItems
            .map((itemId) => data.find((item) => item.id === itemId))
            .filter((item) => item !== undefined);

          selectedData.forEach((concept) => {
            const conceptData = concept.data;

            for (const codeIndex in conceptData) {
              const items = conceptData[codeIndex];
              if (!items || items.length === 0) continue;

              const item = items[0];
              const codeKey = `Sub-Theme ${codeIndex}`;
              const clusterKey = `Open Code ${codeIndex}`;

              const chunks = item.topics.map((topic) => topic.content);

              formattedSelectedData[codeKey] = {
                name: item.name,
                clusters: {
                  [clusterKey]: {
                    name: item.name,
                    chunks: chunks
                  }
                }
              };
            }
          });


          break;
        }

        case "conceptdefinition": {
          selectedData = selectedItems
            .map((itemId) => data.find((item) => item.id === itemId))
            .filter((item) => item !== undefined);
          // const definitions = selectedData.map((item) => item?.definition || "").join(", ");

          selectedData.forEach((concept) => {
            const conceptData = concept.data;

            for (const codeIndex in conceptData) {
              const items = conceptData[codeIndex];
              if (!items || items.length === 0) continue;

              const item = items[0];
              const codeKey = `Sub-Theme ${codeIndex}`;
              const clusterKey = `Open Code ${codeIndex}`;

              const chunks = item.topics.map((topic) => topic.content);

              formattedSelectedData[codeKey] = {
                name: item.name,
                clusters: {
                  [clusterKey]: {
                    name: item.name,
                    chunks: chunks
                  }
                }
              };
            }
          });


          // console.log("Check Formatted Selected Data:", JSON.stringify(formattedSelectedData, null, 2));


          // formData.append("definition", definitions);

          break;
        }

        case "codedefinition": {
          selectedData = selectedItems
            .map((itemId) => data.find((item) => item.id === itemId))
            .filter((item) => item !== undefined);

          selectedData.forEach((item, index) => {
            const clusterKey = `Open Code ${item.id || index + 1}`;
            const chunks = item.topics.map(topic => topic.content);

            formattedSelectedData[clusterKey] = {
              name: item.name,
              chunks: chunks
            };
          });

          break;
        }

        default:
          throw new Error("Invalid type provided");
      }

      const promptTemplate = buttonPromptTemplates[`${type}button`];

      console.log("Type:", type);
      console.log("Looking for template:", `${type}button`);
      console.log("Found template:", promptTemplate);
      console.log("Selected Items:", selectedItems);
      console.log("Selected Data:", formattedSelectedData);


      const requestBody = {
        content: `${promptTemplate}\n\nData to analyze:\n${JSON.stringify(formattedSelectedData, null, 2)}`
      };
      console.log("Request Body:", requestBody);

      formData.append("message", JSON.stringify(requestBody));

      const response = await axios.post(API_URL, formData);

      let rawMessage = response.data.message;
      rawMessage = rawMessage.replace(/(<([^>]+)>)/gi, "").trim();
      const generatedName = rawMessage.replace(/['"]+/g, "");
      console.log("Generated", generatedName);
      return generatedName;
    } catch (error) {
      setError("Generating name failed");
      console.error("Error generating name:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generateName, loading, error };
}
