import os
import openai
import json
from prompt import *
import pdb
import re 
from thefuzz import fuzz

research_questions = ['What are the most valuable insights?', 'do analysis focusing on user\'s specific behaviors that could affect the sleeping quality in the topic clustering round, like \"drink caffeinated drinks\". Also please include both GPT and user\'s sentences']
number_clusters = [12, 18]
stage_prompt_name =  ['cluster_prompt', 'code_prompt', 'concept_prompt', 'display_report_prompt', 'display_graph_prompt']
data_num = 1
trial_num = 5

openai.api_key = "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"

def call_gpt_api(prompt, model="gpt-4o-mini", temperature=0.7):
    """
    Sends a prompt to the specified OpenAI model and returns the text response.
    """
    response = openai.ChatCompletion.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are ChatGPT, a helpful assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=temperature
    )
    return response["choices"][0]["message"]["content"]

def purify_str(item):
    cleaned = re.sub(r"^```.*$", "", item, flags=re.MULTILINE)
    return cleaned

def load_json(file_name):
    with open(file_name, 'r') as f:
        return json.load(f)

def cache_or_call(output_name, call_prompt):
    if os.path.exists(output_name):
        print('cache %s' % output_name)
        with open(output_name, 'r') as f:
            return f.read()
    else:
        print('call %s' % output_name)
        output_response = purify_str(call_gpt_api(call_prompt))
        with open(output_name, "w", encoding="utf-8") as f:
            f.write(output_response)
        return output_response


def fetch_data():
    for i in range(data_num):
        for j in range(trial_num):
            # Save cluster output to file
            with open("./data/data%d.txt" %i, "r", encoding="utf-8") as f:
                raw_text_data = f.read()
            cluster_str = cluster_prompt.replace("{inputData}", raw_text_data).replace("{researchQuestions}", research_questions[i]).replace("{numberOfTopicClusters}", str(number_clusters[i]))
            output_name = "./output/data%d_trial%d_cluster_output.json"%(i,j)
            cluster_response = cache_or_call(output_name, cluster_str)
            
            # Save code output to file
            output_name = "./output/data%d_trial%d_code_output.json"%(i,j)
            code_str = code_prompt.replace("{inputData}", cluster_response)
            code_response = cache_or_call(output_name, code_str)
            
            # Save concept output to file
            output_name = "./output/data%d_trial%d_concept_output.json"%(i,j)
            concept_str = concept_prompt.replace("{inputData}", code_response).replace("{researchQuestions}", research_questions[i]).replace("{numberOfTopicClusters}", str(number_clusters[i]))
            concept_response = cache_or_call(output_name, concept_str)
            
            output_name = "./output/data%d_trial%d_display_report_output.json"%(i,j)
            display_report_str = display_report_prompt.replace("{inputData}", concept_response).replace("{researchQuestions}", research_questions[i]).replace("{numberOfTopicClusters}", str(number_clusters[i]))
            display_report_response = cache_or_call(output_name, display_report_str)
                
            output_name = "./output/data%d_trial%d_display_graph_output.json"%(i,j)    
            display_graph_str = display_graph_prompt.replace("{inputData}", concept_response).replace("{researchQuestions}", research_questions[i]).replace("{numberOfTopicClusters}", str(number_clusters[i]))
            display_graph_response = cache_or_call(output_name, display_graph_str)


def extract_chunks(obj):
    gathered = []
    if isinstance(obj, dict):
        # If current object is a dict, check if it has a "chunks" key
        if "chunks" in obj and isinstance(obj["chunks"], list):
            gathered.extend(obj["chunks"])
        # Recursively check all sub-values
        for value in obj.values():
            gathered.extend(extract_chunks(value))
    elif isinstance(obj, list):
        # If current object is a list, recurse on each item
        for item in obj:
            gathered.extend(extract_chunks(item))
    return gathered

def extract_cluster_names(obj, result=None):
    if result is None:
        result = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.startswith("Cluster"):
                # If this is a cluster, get its name if present
                if "name" in v:
                    result.append(v["name"])
            # Recurse deeper
            extract_cluster_names(v, result)
    elif isinstance(obj, list):
        for item in obj:
            extract_cluster_names(item, result)
    return result

def extract_code_names(obj, result=None):
    if result is None:
        result = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.startswith("Code"):
                # If this is a cluster, get its name if present
                if "name" in v:
                    result.append(v["name"])
            # Recurse deeper
            extract_code_names(v, result)
    elif isinstance(obj, list):
        for item in obj:
            extract_code_names(item, result)
    return result

def extract_concept_names(obj, result=None):
    if result is None:
        result = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.startswith("Concept"):
                # If this is a cluster, get its name if present
                if "name" in v:
                    result.append(v["name"])
            # Recurse deeper
            extract_concept_names(v, result)
    elif isinstance(obj, list):
        for item in obj:
            extract_concept_names(item, result)
    return result

def chunk_metrics(chunks, data):
    matched = 0
    token_count = 0
    total_token_count = len(data.split())
    for chunk in chunks:
        if chunk in data:
            matched += 1
        else:
            pass
            #print(chunk)
        token_count += len(chunk.split())
    #consistancy ration, data coverage
    return matched / len(chunks), token_count/total_token_count

def list_acc(old_list, new_list, debugging=False):
    matched_count = 0
    for i in new_list:
        if i in old_list:
            matched_count += 1
        else:
            if debugging:
                print(i)
    return matched_count/len(new_list)

#使用每个chunk开头前3个单词和结尾后三个单词匹配             
def find_chunk_in_text(original_text, chunk):
    chunk_words = chunk.split()
    match_num = 2
    if len(chunk_words) >= 6:
        match_num = 3
    if len(chunk_words) >= 10:
        match_num = 5
    if len(chunk_words) >= 20:
        match_num = 10
    

    first_3 = ' '.join(chunk_words[:match_num])
    last_3 = ' '.join(chunk_words[-match_num:])
    pattern = re.compile(
        re.escape(first_3) + r'(.*?)' + re.escape(last_3), 
        flags=re.DOTALL
    )
    match = pattern.search(original_text)
    if match:
        # The matched substring includes first_3 and last_3,
        # so we reconstruct the entire match
        # group(0) includes the entire match
        return match.group(0)
    else:
        first_3 = str.lower(first_3[0]) + first_3[1:]
        pattern = re.compile(
            re.escape(first_3) + r'(.*?)' + re.escape(last_3), 
            flags=re.DOTALL
        )
        match = pattern.search(original_text)
        if match:
            # The matched substring includes first_3 and last_3,
            # so we reconstruct the entire match
            # group(0) includes the entire match
            return match.group(0)
        
        return None

def compute_chunk_ratio(ref_chunks, llm_chunks):
    ratios = 0
    # ref_chunks = sorted(ref_chunks)
    # llm_chunks = sorted(llm_chunks)
    for i in range(len(ref_chunks)):
        if i < len(llm_chunks):
            ratio = fuzz.ratio(llm_chunks[i],ref_chunks[i]) /100
            ratios  += ratio
            if ratio < 0.8:
                print('Low ratio %f' % ratio)
                print(llm_chunks[i])
                print(ref_chunks[i])
        else:
            #长度不匹配直接计为0
            break
    if len(ref_chunks) != len(llm_chunks):
        print('ref chunk len %d, llm chunk len %d' % (len(ref_chunks), len(llm_chunks)))
    return ratios/max(len(ref_chunks), len(llm_chunks))
        

def cal_metrics():
    for i in range(data_num):
        data_name = "./data/data%d.txt" %i
        with open("./data/data%d.txt" %i, "r", encoding="utf-8") as f:
            raw_text_data = f.read()
            
            
        for j in range(trial_num):
            # stage 1
            cluster_name = "./output/data%d_trial%d_cluster_output.json"%(i,j)
            cluster_data = load_json(cluster_name)
            
            cluster_cluster_names = extract_cluster_names(cluster_data)
            cluster_chunks = extract_chunks(cluster_data)
            candidate_chunks = [find_chunk_in_text(raw_text_data, c) for c in cluster_chunks]
            chunk_cons, chunk_cov = chunk_metrics(cluster_chunks, raw_text_data)
            chunk_ratio = compute_chunk_ratio(candidate_chunks, cluster_chunks)
            print('[Data %d][Trial %d][Cluster Stage]Chunk Cons %f, Chunk Cov %f' % (i, j, chunk_ratio, chunk_cov))
            
            # stage 2
            code_name = "./output/data%d_trial%d_code_output.json"%(i,j)
            code_data = load_json(code_name)
            code_cluster_names = extract_cluster_names(code_data )
            code_chunks = extract_chunks(code_data)
            code_code_names = extract_code_names(code_data )
            
            chunk_cons = list_acc(cluster_chunks, code_chunks)
            # chunk_ratio = compute_chunk_ratio(candidate_chunks, code_chunks)
            cluster_name_cons = list_acc(cluster_cluster_names, code_cluster_names)
            print('[Data %d][Trial %d][Code Stage]Chunk Cons %f, cluster_name_cons %f' % (i, j,chunk_cons, cluster_name_cons))
            
            # stage 3
            concept_name = "./output/data%d_trial%d_concept_output.json"%(i,j)
            concept_data = load_json(concept_name)
            concept_cluster_names = extract_cluster_names(concept_data)
            concept_chunks = extract_chunks(concept_data)
            concept_code_names = extract_code_names(concept_data)
            concept_concept_names = extract_code_names(concept_data)
            
            chunk_cons = list_acc(cluster_chunks, concept_chunks)
            # chunk_ratio = compute_chunk_ratio(candidate_chunks, concept_chunks)
            cluster_name_cons = list_acc(cluster_cluster_names, concept_cluster_names)
            code_name_cons = list_acc(code_code_names, concept_code_names)
            
            print('[Data %d][Trial %d][Concept Stage]Chunk Cons %f,  cluster_name_cons %f, code_name_cons %f ' % (i, j,chunk_cons,cluster_name_cons, code_name_cons))
          
            # display_report_name = "./output/data%d_trial%d_display_report_output.json"%(i,j)
            # display_graph_name = "./output/data%d_trial%d_display_graph_output.json"%(i,j)

def main():
    #fetch_data()
    cal_metrics()


if __name__ == "__main__":
    main()