
export type infoStore = {
  nickname: string, // use name
  projectname: string, // project name
  setNickname: (value: string) => void,
  setProjectname: (value: string) => void,
  model: string,
  setModel: (value: string) => void,
  selectedSteps: string[],
  setSelectedSteps: (value: string[]) => void,
}

export type datapoint = {
  id: string, // file name
  content: string, // data contents
  uuid: string, // unique id
}

export type card = {
  id: string, // card numbers
  topics: datapoint[],
  active?: boolean, // if moved to trash
  isGPT?: boolean;
  name: string;
}

export type cardStore = {
  cardData: card[],
  setcardData: (value: card[]) => void,
  // LLM task information for the card step
  whatLLMDid: string;
  setWhatLLMDid: (whatLLMDid: string) => void;
  rationale: string;
  setRationale: (rationale: string) => void;
  llmDescription: string;
  setLlmDescription: (llmDescription: string) => void;
}

export type code = {
  name: string,
  id: string,
  data: Record<string, card[]>;
  color?: string,
  isGPT?: boolean;
  nanoid?: string;
  definition?: string;
}

export type codeStore = {
  codeData: code[],
  setCodeData: (codedata: code[], regenerate?: boolean) => void,
  // LLM task information for the code step
  whatLLMDid: string;
  setWhatLLMDid: (whatLLMDid: string) => void;
  rationale: string;
  setRationale: (rationale: string) => void;
  llmDescription: string;
  setLlmDescription: (llmDescription: string) => void;
}

export type concept = {
  name: string;
  definition: string;
  codes: Record<string, code[]>;
  id: string;
  color?: string;
  isGPT?: boolean;
  nanoid?: string;
};

export type conceptStore = {
  conceptData: concept[];
  setConceptData: (conceptData: concept[]) => void;
  // LLM task information for the concept step
  whatLLMDid: string;
  setWhatLLMDid: (whatLLMDid: string) => void;
  rationale: string;
  setRationale: (rationale: string) => void;
  llmDescription: string;
  setLlmDescription: (llmDescription: string) => void;
};

// New type for LLM task information
export type llmTaskInfo = {
  whatLLMDid: string;
  rationale: string;
};

export type report = {
  Report?: {
    Title: string;
    Sections: Array<{
      Title: string;
      Content: string;
      Subsections?: Array<{
        Title: string;
        Content: string;
      }>;
    }>;
  };
  title?: string;
  sections?: Array<{
    title: string;
    content: string;
    subsections?: Array<{
      title: string;
      content: string;
    }>;
  }>;
};

export type graph = {
  id: string;
  dot: string;
};
