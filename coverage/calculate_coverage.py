import re
import os
import pdb

def process_and_count(file_path):
    """Reads a file, removes punctuation, and counts the words."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
            # Remove punctuation and numbers, keep only words and whitespace
            text = re.sub(r'[^\w\s]', '', text)
            # Convert to lower case and split into words
            words = text.lower().split()
            return len(words)
    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
        return 0
    except Exception as e:
        print(f"An error occurred while processing {file_path}: {e}")
        return 0

# Define file paths
cover_file = '/Users/junming/code/MindCoder/coverage/cover.txt'
not_cover_file = '/Users/junming/code/MindCoder/coverage/not_cover.txt'

# Get word counts
cover_word_count = process_and_count(cover_file)
not_cover_word_count = process_and_count(not_cover_file)

# Calculate the total word count
total_word_count = cover_word_count + not_cover_word_count

# Calculate and print the coverage ratio
if total_word_count > 0:
    coverage_ratio = cover_word_count / total_word_count
    print(f"Cover Word Count: {cover_word_count}")
    print(f"Not Cover Word Count: {not_cover_word_count}")
    print(f"Total Word Count: {total_word_count}")
    print(f"Coverage Ratio: {coverage_ratio:.4f}")
else:
    print("Cannot calculate coverage ratio because total word count is zero.")