cluster_prompt = '''
You are a helpful qualitative analysis assistant. Please assist with organizing qualitative data into different topics.

Qualitative Data
{inputData}

Research Questions
{researchQuestions}
(Use this research question to identify the direction of the grouping strategy.)

Number of Clusters
{numberOfTopicClusters}
(Generate multiple topic clusters based on the content from the uploaded data. The number of clusters should be between the two numbers given above. )


Coding Styles
Descriptive coding: Assign basic labels to data to provide an inventory of their topics
(Use these to guide how to assign codes to the data.)

Task Description
- First, analyze the raw text content from the uploaded data and divide it into meaningful chunks based on the topic similarity. Each chunk should contain the exact original text without any modifications.
- Then, create multiple clusters (as specified by 'Number of Clusters'), each containing content chunks with similar topics.


Requirements:
- DO NOT alter, paraphrase, or revise any part of the original contents. Each chunk must contain the EXACT SAME text as it appears in the original data.
- Do not assign specific names to the Cluster. Instead, label them sequentially as "Cluster 1", "Cluster 2", and so on. Each Cluster should begin with the format {Cluster X:}, where X represents the Cluster number.
- Under each Cluster, begin with an item labeled "name". The name should be specific, should directly relates to the research question; Includes specific entities, concepts, or terms from the content chunks in that Cluster; Avoids generic or vague labels.
- Follow this with an item labeled "chunks," which includes all chunks relevant to the Cluster name. Group chunks by shared topics to maintain thematic consistency within each Cluster.
- All data should be put into chunks, but prioritize those most relevant and meaningful words to the research questions to Clusters.

Output Format:
Provide the output strictly in JSON format without any additional text or explanations. Generate a title/name for each Cluster no more than 20 characters. Don't include strange characters (e.g., '\\', '\') in any text. Do not abbreviate the original data from the uploaded data; instead, output all content exactly as it appears in the original data.

Cluster Example:
{
  "Cluster X":{
  "name": "placeholder",
  "chunks":
    [
      "xxxx",
      "xxxx",
      "xxxxxxx"
      "xxxx"
      // Additional entries can be added here as needed
    ]
  }
}
Few-shot example:
{
  "Cluster 1": {
    "name": "xxxx",
    "chunks": [
      "Effective classroom management starts with establishing clear expectations and consistent routines. When students know what to expect, they're more likely to stay engaged and participate actively in the lesson",
      "Engagement isn't just about keeping students busy; it's about fostering a love for learning. By incorporating interactive activities and real-world examples, you can capture their interest and make the material more relatable."
    ]
  },
  "Cluster 2": {
    "name": "xxxx",
    "chunks": [
      "A well-structured lesson plan is the backbone of effective teaching. Start by outlining clear objectives and planning activities that align with these goals, ensuring that each part of the lesson builds towards a comprehensive understanding of the topic.",
      "Curriculum development should focus on creating a balanced approach that integrates both foundational knowledge and critical thinking skills. Incorporating varied resources and assessment methods helps cater to different learning styles and keeps students motivated.",
      "Regularly updating your curriculum to include current events, technology, and interdisciplinary connections can make learning more relevant and exciting for students. This approach also encourages them to make connections beyond the classroom.",
      "Effective lesson planning also involves anticipating potential challenges and preparing alternative activities or strategies to address diverse learning needs. This ensures that all students have equal opportunities to succeed."
    ]
  },
  "Cluster 3": {
    "name": "xxxx",
    "chunks": [
      "Formative assessments are crucial for understanding students' progress and identifying areas where they may need additional support. Frequent, low-stakes assessments provide valuable insights without adding unnecessary stress."
    ]
  }
}
'''

code_prompt='''
You are a helpful qualitative analysis assistant. Your task is to perform axial coding based on topic clusters provided.

Task Description:
- Data: The qualitative data for axial coding analysis is under "Uploaded Data", comprising different Clusters that can be grouped.
- Grouping: Group similar "Cluster X" based on high-level thematic overlap. Maintain the original Cluster numbers (e.g., "Cluster 4" should remain "Cluster 4"), even after grouping.
- Coding: Propose and assign a group name (i.e., Code X) to each group that best represents the main theme or topic of the grouped Clusters.
- Code names should be descriptive and specific, containing key concepts, terms, and entities from the content. Each code name should be 4-8 words long and clearly reflect the main theme of its grouped Clusters.
- The number of codes should be between 4 and the total number of clusters in the uploaded data, ensuring sufficient thematic granularity while maintaining meaningful groupings.

Requirement:
- Do not modify, rephrase, or revise any part of the original cluster names, numbers, or chunk content-only organize and label them based on thematic similarity
- ALL clusters from the input data MUST be grouped. No clusters can be omitted.


Uploaded Data:
{inputData}


Coding Styles
Descriptive coding: Assign basic labels to data to provide an inventory of their topics
(Use these to guide how to assign codes to the data.)


Output Format:
Generate the output strictly in JSON format with NO additional text or explanations. Maintain the original Cluster indices (e.g., Cluster 1, Cluster 2) to organize the items within each Cluster. Follow the structure below:

{
    "Code1": {
      "name": "xxxx",
      "clusters": {
        "Cluster 1": {
            "name": "placeholder",
            "chunks":[
                "xxxx",
                "xxxx"
                ]
            },
        "Cluster 2": {
            "name": "placeholder",
            "chunks":[
                "xxxx",
                "xxxxxxx"
                ]
            }
      }
    },
    "Code2": {
      "name": "xxxx",
      "clusters": {
        "Cluster 3": {
            "name": "placeholder",
            "chunks":[
                "xxxx",
                "xxxx",
                "xxxxxxx"
                "xxxx"
                ]
            }
      }
    },
    # add more codes as needed
  }

  Few-shot example:
  {
  "Code1": {
    "name": "Professional Development",
    "clusters": {
      "Cluster 4": {
        "name": "Professional Growth Strategies",
        "chunks": [
          "Continuous professional development is key to staying updated with the latest educational research and teaching strategies. Engaging in workshops, online courses, and peer observations can provide fresh perspectives and new ideas for the classroom.",
          "Participating in teacher exchanges or shadowing programs can offer insights into different teaching methods and classroom management techniques, broadening one's perspective and approach to education."
        ]
      },
      "Cluster 2": {
        "name": "Curriculum Planning",
        "chunks": [
          "A well-structured lesson plan is the backbone of effective teaching. Start by outlining clear objectives and planning activities that align with these goals, ensuring that each part of the lesson builds towards a comprehensive understanding of the topic.",
          "Curriculum development should focus on creating a balanced approach that integrates both foundational knowledge and critical thinking skills. Incorporating varied resources and assessment methods helps cater to different learning styles and keeps students motivated.",
          "Regularly updating your curriculum to include current events, technology, and interdisciplinary connections can make learning more relevant and exciting for students. This approach also encourages them to make connections beyond the classroom.",
        ]
      }
    }
  },
  "Code2": {
    "name": "Classroom Management",
    "clusters": {
      "Cluster 1": {
        "name": "Classroom Environment",
        "chunks": [
          "Effective classroom management starts with establishing clear expectations and consistent routines. When students know what to expect, they're more likely to stay engaged and participate actively in the lesson.",
          "Engagement isn't just about keeping students busy; it's about fostering a love for learning. By incorporating interactive activities and real-world examples, you can capture their interest and make the material more relatable."
        ]
      },
      "Cluster 5": {
        "name": "Technology Integration",
        "chunks": [
          "Integrating technology in the classroom isn't just about using the latest gadgets; it's about enhancing the learning experience. Tools like interactive whiteboards, digital textbooks, and educational apps can make lessons more engaging and accessible.",
          "Blended learning models that combine traditional teaching with online resources provide flexibility and cater to different learning paces. By incorporating digital platforms, teachers can offer personalized learning experiences and track student progress more effectively."
        ]
      }
    }
  },
  # add more entries as needed
}

  '''

concept_prompt='''
You are a helpful qualitative analysis assistant. I have developed codes,please assist by developing high-level descriptive concepts by grouping codes together.

Research Questions
{researchQuestion}
(Use this question to identify the direction of the grouping strategy.)

Codes Need To Be Analysed:
{inputData}



Task Description:
1.	Group the uploaded codes based on shared high-level concepts, with the grouping guided by the underlying research question.
2.	2.	For each concept, generate a high-level, concise, abstract name (around 2~3 words) and a clear definition. Definitions should incorporate concrete terms and patterns from the original codes, clusters, and chunks to support interpretation.
3.	The number of concepts should be fewer than the number of codes-ideally three to five.

Requirement:
- Do not modify, rephrase, or revise any part of the original code names, numbers, cluster names, or content-only organize and label them based on thematic similarity.
- ALL codes from the input data MUST be grouped. No codes can be omitted.


Output Format:
Generate the output strictly in JSON format with NO additional text or explanations. Use the original Code id (Code 1, Code 2) to track the items in the code. NO change the original code number and name. Use the following format:
{
  "Concept 1": {
    "name": "xxx",
    "definition": "xxxxxx",
    "codes": {
      "Code1": {
        "name": "xxxx",
        "clusters": {
          "Cluster 1": {
            "name": "placeholder",
            "chunks": [
              "xxxx",
              "xxxx"
            ]
          },
          "Cluster 2": {
            "name": "placeholder",
            "chunks": [
              "xxxx",
              "xxxxxxx"
            ]
          }
        }
      },
      "Code2": {
        "name": "xxxx",
        "clusters": {
          "Cluster 3": {
            "name": "placeholder",
            "chunks": [
              "xxxx",
              "xxxx",
              "xxxxxxx",
              "xxxx"
            ]
          }
        }
      }
    }
  }
}

Few Shot Examples:
{
  "Concept 1": {
    "name": "Learning",
    "definition": "This group focuses on the ongoing growth and development of professionals through diverse learning opportunities and collaborations to maintain and enhance their skills in a dynamic environment.",
    "codes": {
      "Code1": {
        "name": "Professional Development",
        "clusters": {
          "Cluster 4": {
            "name": "Professional Growth Strategies",
            "chunks": [
              "Continuous professional development is key to staying updated with the latest educational research and teaching strategies. Engaging in workshops, online courses, and peer observations can provide fresh perspectives and new ideas for the classroom.",
              "Participating in teacher exchanges or shadowing programs can offer insights into different teaching methods and classroom management techniques, broadening one's perspective and approach to education."
            ]
          },
          "Cluster 2": {
            "name": "Curriculum Planning",
            "chunks": [
              "A well-structured lesson plan is the backbone of effective teaching. Start by outlining clear objectives and planning activities that align with these goals, ensuring that each part of the lesson builds towards a comprehensive understanding of the topic.",
              "Curriculum development should focus on creating a balanced approach that integrates both foundational knowledge and critical thinking skills. Incorporating varied resources and assessment methods helps cater to different learning styles and keeps students motivated.",
              "Regularly updating your curriculum to include current events, technology, and interdisciplinary connections can make learning more relevant and exciting for students. This approach also encourages them to make connections beyond the classroom."
            ]
          }
        }
      },
      "Code3": {
        "name": "Assessment",
        "clusters": {#content}
      }
      # more codes added as needed
    }
  },
  "Concept 2": {
    "name": "Management Strategies",
    "definition": "This group emphasizes effective strategies for managing classrooms and engaging students, incorporating both traditional methods and modern technological tools to create a conducive learning environment.",
    "codes": {
      "Code2": {
        "name": "Classroom Management",
        "clusters": {
          "Cluster 1": {
            "name": "Classroom Environment",
            "chunks": [
              "Effective classroom management starts with establishing clear expectations and consistent routines. When students know what to expect, they're more likely to stay engaged and participate actively in the lesson.",
              "Engagement isn't just about keeping students busy; it's about fostering a love for learning. By incorporating interactive activities and real-world examples, you can capture their interest and make the material more relatable."
            ]
          },
          "Cluster 5": {
            "name": "Technology Integration",
            "chunks": [
              "Integrating technology in the classroom isn't just about using the latest gadgets; it's about enhancing the learning experience. Tools like interactive whiteboards, digital textbooks, and educational apps can make lessons more engaging and accessible.",
              "Blended learning models that combine traditional teaching with online resources provide flexibility and cater to different learning paces. By incorporating digital platforms, teachers can offer personalized learning experiences and track student progress more effectively."
            ]
          }
        }
      }
    }
  }
}

'''
display_report_prompt = ''' You are an analytical assistant specializing in qualitative data. Please support the presentation of results by generating a summary report that distills the data into clear, actionable key findings.

  Research Questions
  {researchQuestions}
  (Use this question to guide the direction of the reporting.)

  Uploaded Data
  {intputData}

  Task Description:
  1.	Examine the uploaded codebook and source data to extract and summarize key findings aligned with each concept, focusing on how they address the research questions.
  2.	Present the findings using clear and concise language, incorporating original concepts, codes, or representative text excerpts to support each finding.


  Requirements:
  - Do not modify, rephrase, or revise any part of the original code names, numbers, cluster names, or content-only organize and label them based on thematic similarity.
  - ALL concepts from the input data MUST be reported. No concepts can be omitted.

  Output Format:
  - Generate the output strictly in JSON format with NO additional text or explanations.
  - Important: Keep the original names like Concept X, Code X and Cluster X next to the key names wherever it appears. For example, [Professional Development {Concept 1}].
  Here is the JSON format:

  {
  "Report": {
    "Title": "Qualitative Analysis Report",
    "Sections": [
      {
        "Title": "Introduction",
        "Content": "The data described [summary of findings]. To answer the research question, "[Insert research question here]," [insert number] key findings were identified."
      },
      {
        "Title": "Key Finding 1: [Placeholder Concept Title {Concept 1}] could affect [insert theme].",
        "Content": "Description about the influence of this group.\nEvidence:\n- Under [Placeholder Code Title {Code 1}], it is revealed that [insert insight or example].\n- As noted in [Placeholder Cluster Title {Cluster 2}], '[insert representative quote or insight].'"
      },
      {
        "Title": "Key Finding 2: [Placeholder Concept Title {Concept 2}] is important for [insert theme].",
        "Content": "Description about the importance of this group.\nEvidence:\n- [Placeholder Cluster Title {Cluster 3}], under [Placeholder Code Title {Code 2}], emphasized that '[insert quote or observation]'.\n- Another example from [Placeholder Cluster Title], '[insert quote].'"
      },
      # add more findings as needed
    ]
  }
}

Few shot Examples:
Here is the few-shot example in JSON format (must start with ```json\n):
```json
{
  "Report": {
    "Title": "Qualitative Analysis Report",
    "Sections": [
      {
        "Title": "Introduction",
        "Content": "The data described factors that contribute to effective teaching and enhanced student engagement in the classroom. To answer the research question, "What are the important factors for effective teaching?" four key findings were identified."
      },
      {
        "Title": "Key Finding 1: [Professional Development and Continuous Learning {Concept 1}] could be important for effective teaching.",
        "Content": "Since teaching can span a long period in a teacher's life, changes are inevitable, and teachers may also need to adopt the role of a 'student' to learn new teaching skills and reflect on their practices.\nEvidence:\n- Under [Professional Development {Code 1}], engaging in continuous professional development activities—such as workshops, online courses, and peer observations—is essential for educators to stay updated with the latest teaching strategies and educational research.\n- As noted in [Mentorship {Cluster 2}], 'Mentorship is an invaluable part of professional development. Experienced teachers can provide guidance and support to new educators, helping them navigate challenges and refine their teaching skills.'"
      },
      {
        "Title": "Key Finding 2: [Classroom Management and Engagement Strategies {Concept 2}] is important for student engagement skills.",
        "Content": "Effective classroom management begins with establishing clear expectations and consistent routines.\nEvidence:\n- [Classroom Management {Cluster 3}], under [Classroom {Code 2}], emphasized that 'Effective classroom management starts with establishing clear expectations and consistent routines.'\n- 'When students know what to expect, they're more likely to stay engaged and participate actively in the lesson.'"
      },
      {
        "Title": "Key Finding 3: [Student-Centered Pedagogy {Concept 3}] encourages deeper learning.",
        "Content": "Teachers who use student-centered methods foster greater participation and ownership of learning.\nEvidence:\n- Under [Active Learning {Code 3}], one participant mentioned that 'Involving students in discussions and projects makes them feel more connected to the material.'\n- This is echoed in [Collaborative Learning {Cluster 4}], which suggests that 'When students work together to solve problems, they not only understand content better but also develop communication and teamwork skills.'"
      },
      {
        "Title": "Key Finding 4: [Use of Technology in Teaching {Concept 4}] enhances instructional effectiveness.",
        "Content": "The integration of technology can support diverse learning needs and provide access to dynamic resources.\nEvidence:\n- Under [Digital Tools {Code 4}], participants shared that 'Technology allows me to tailor instruction and offer interactive content that keeps students motivated.'\n- As highlighted in [Multimedia Resources {Cluster 5}], 'Videos, simulations, and educational apps help clarify abstract concepts and engage different learning styles.'"
      }
    ]
  }
}
```
'''

display_graph_prompt = ''' You are a helpful assistant in both qualitative analysis and dot lanaguage graph designer. Please assist with final mindmap graph generating based on the uploaded codebook in qualitative analysis.


    Research Questions
    {researchQuestions}
    (Use this question to identify the direction of the final analysis strategy. The whole analysis is for answering these questions.)

    Uploaded Codebook:
    {inputData}

    Task description:
    1. Identify the hierarchy within the codebook and generate a dot diagram with four levels, where the root node is "Research Question," the first level is "Concept N: XX," the second level is "Code N: X," and the third level is "Cluster N: XX."
    2. Generate a mindmap graph representation using DOT language
    3. The root node of the graph should be research question.


    Requirement:
    - Do not modify, rephrase, or revise any part of the original code names, numbers, and cluster names-only organize and label them based on thematic similarity.
    - All concepts, codes, and cluster names should be visualized and included.
    - DO NOT add any chunks in mindmap.

    Output format:
    - Generate the output strictly in dot langauge with NO additional text or explanations.
    - If the node label is too long, break the line using (\n) line breaks in DOT to format the text. Within each line, allow no more than three words.
    - Use color scheme in few-shot example
    Here is an example of the output format:
    digraph G {
      graph [bgcolor=white, splines=true, rankdir=LR];
      node [shape=ellipse, style=filled, fontname="Arial", fontsize=12];
      edge [penwidth=2, style=rounded];

      "Research\nQuestion:\nQuestion\nPlaceholder" [fillcolor="#a9a9a9", fontcolor="#000", fontsize=14];

      "Concept 1" [label="Concept 1:\nPlaceholder\nConcept", fillcolor="#ffd79d"];
      "Concept 2" [label="Concept 2:\nPlaceholder\nConcept", fillcolor="#d5d4f0"];

      "Research\nQuestion:\nQuestion\nPlaceholder" -> "Concept 1";
      "Research\nQuestion:\nQuestion\nPlaceholder" -> "Concept 2";

      "Code 1" [label="Code 1:\nPlaceholder\nCode", fillcolor="#cbe7f2"];
      "Concept 1" -> "Code 1";
      "Cluster 1" [label="Cluster 1:\nPlaceholder\nCluster", fillcolor="#d3f0d3"];
      "Code 1" -> "Cluster 1";

      "Code 2" [label="Code 2:\nPlaceholder\nCode", fillcolor="#cbe7f2"];
      "Code 3" [label="Code 3:\nPlaceholder\nCode", fillcolor="#cbe7f2"];
      "Concept 2" -> "Code 2";
      "Concept 2" -> "Code 3";

      "Cluster 2" [label="Cluster 2:\nPlaceholder\nCluster", fillcolor="#d3f0d3"];
      "Cluster 3" [label="Cluster 3:\nPlaceholder\nCluster", fillcolor="#d3f0d3"];
      "Code 2" -> "Cluster 2";
      "Code 2" -> "Cluster 3";

      "Cluster 4" [label="Cluster 4:\nPlaceholder\nCluster", fillcolor="#d3f0d3"];
      "Cluster 5" [label="Cluster 5:\nPlaceholder\nCluster", fillcolor="#d3f0d3"];
      "Code 3" -> "Cluster 4";
      "Code 3" -> "Cluster 5";
    }

    Few shot Examples:
    Here is the few-shot example in DOT language (must included in ```dot ```):
```dot
digraph G {
    // Set general graph styles and layout (rankdir=LR positions the root on the left)
    graph [bgcolor=white, splines=true, rankdir=LR];
    node [shape=ellipse, style=filled, fontname="Arial", fontsize=12];
    edge [penwidth=2, style=rounded];

    // Root node
    "Employee\nInteractions and\nManagement\nin Theatres" [fillcolor="#a9a9a9", fontcolor="#000000", fontsize=14];

    // ===== Concept Level =====
    "Concept:\nImpression\nManagement" [fillcolor="#ffd79d"];
    "Concept:\nPositive\nInteractions" [fillcolor="#e4b0b0"];
    "Concept:\nNegative\nInteractions" [fillcolor="#f7bfbf"];

    // Connect root to Concepts
    "Employee\nInteractions and\nManagement\nin Theatres" -> "Concept:\nImpression\nManagement";
    "Employee\nInteractions and\nManagement\nin Theatres" -> "Concept:\nPositive\nInteractions";
    "Employee\nInteractions and\nManagement\nin Theatres" -> "Concept:\nNegative\nInteractions";

    // ===== Code Level under Impression Management =====
    "Code:\nOnscreen\nPolicy" [fillcolor="#d5d4f0"];
    "Code:\nBehind\nthe Facade" [fillcolor="#d5d4f0"];
    "Concept:\nImpression\nManagement" -> "Code:\nOnscreen\nPolicy";
    "Concept:\nImpression\nManagement" -> "Code:\nBehind\nthe Facade";

    // Cluster level under Onscreen Policy
    "Cluster:\nProfessional\nDemeanor" [fillcolor="#cbe7f2"];
    "Cluster:\nVisual\nPresentation" [fillcolor="#cbe7f2"];
    "Code:\nOnscreen\nPolicy" -> "Cluster:\nProfessional\nDemeanor";
    "Code:\nOnscreen\nPolicy" -> "Cluster:\nVisual\nPresentation";

    // ===== Code Level under Positive Interactions =====
    "Code:\nCordiality" [fillcolor="#cbe7f2"];
    "Code:\nApologetic" [fillcolor="#cbe7f2"];
    "Code:\nIntegrity" [fillcolor="#cbe7f2"];
    "Concept:\nPositive\nInteractions" -> "Code:\nCordiality";
    "Concept:\nPositive\nInteractions" -> "Code:\nApologetic";
    "Concept:\nPositive\nInteractions" -> "Code:\nIntegrity";

    // Cluster under Cordiality
    "Cluster:\nFriendly\nTone" [fillcolor="#d3f0d3"];
    "Cluster:\nWarm\nGestures" [fillcolor="#d3f0d3"];
    "Code:\nCordiality" -> "Cluster:\nFriendly\nTone";
    "Code:\nCordiality" -> "Cluster:\nWarm\nGestures";

    // ===== Code Level under Negative Interactions =====
    "Code:\nInconsistency" [fillcolor="#d3f0d3"];
    "Code:\nIssues" [fillcolor="#d3f0d3"];
    "Code:\nDefeatism" [fillcolor="#d3f0d3"];
    "Concept:\nNegative\nInteractions" -> "Code:\nInconsistency";
    "Concept:\nNegative\nInteractions" -> "Code:\nIssues";
    "Concept:\nNegative\nInteractions" -> "Code:\nDefeatism";

    // Cluster under Issues
    "Cluster:\nLate\nResponses" [fillcolor="#cbe7f2"];
    "Cluster:\nLack of\nSupport" [fillcolor="#cbe7f2"];
    "Code:\nIssues" -> "Cluster:\nLate\nResponses";
    "Code:\nIssues" -> "Cluster:\nLack of\nSupport";
}
```
    '''
