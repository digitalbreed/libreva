import re
import logging
from typing import List, Tuple, Dict

logger = logging.getLogger(__name__)

# We use word count as a proxy for token count since words are always split into equal or fewer tokens.
# Since Chatterbox TTS is English-only right now, we can make an informed estimate:
# - Average English word length is ~5 characters
# - Common English tokenizers (like BPE) split into 2-4 character subword units
# - This means English words are typically split into 1-3 tokens each
# - Using 400 words as our limit ensures we stay under the 1000 token limit
#   even with the maximum expected token expansion
# See https://github.com/resemble-ai/chatterbox/blob/master/src/chatterbox/tts.py#L246
MAX_TOKENS_PER_CHUNK = 400

def sanitize_text(text: str) -> str:
    """
    Sanitize text by removing unwanted characters and normalizing whitespace.
    """
    if not text or not isinstance(text, str):
        return ""
        
    # Remove control characters except newlines
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    
    # Normalize whitespace (preserve newlines)
    text = re.sub(r'[ \t]+', ' ', text)
    
    # Remove multiple newlines
    text = re.sub(r'\n\s*\n', '\n', text)
    
    # Trim whitespace
    text = text.strip()
    
    return text

def split_into_chunks(text: str, max_tokens: int = MAX_TOKENS_PER_CHUNK) -> List[str]:
    """
    Split text into chunks that respect sentence boundaries and token limits.
    """
    if not text:
        return []
        
    # First sanitize the text
    text = sanitize_text(text)
    
    # Split into sentences (preserving punctuation)
    sentences = re.split(r'([.!?]+)\s+', text)
    
    # Recombine sentences with their punctuation
    sentences = [''.join(i) for i in zip(sentences[::2], sentences[1::2] + [''])]
    
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        # Rough estimate of tokens (words + punctuation)
        sentence_length = len(sentence.split())
        
        if current_length + sentence_length > max_tokens:
            if current_chunk:
                chunks.append(' '.join(current_chunk))
                current_chunk = []
                current_length = 0
            
            # If a single sentence is longer than max_tokens, split it
            if sentence_length > max_tokens:
                words = sentence.split()
                for i in range(0, len(words), max_tokens):
                    chunk = ' '.join(words[i:i + max_tokens])
                    chunks.append(chunk)
            else:
                current_chunk = [sentence]
                current_length = sentence_length
        else:
            current_chunk.append(sentence)
            current_length += sentence_length
    
    # Add the last chunk if it exists
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def parse_text_with_markers(text: str) -> List[Tuple[str, Dict]]:
    """
    Parse text containing markers:
    - <p=N> for pause in milliseconds
    - <e=N> for exaggeration value
    - <t=N> for temperature value
    
    Returns a list of tuples (text_part, settings_dict).
    settings_dict contains:
    - pause_ms: Optional[int] - pause duration in milliseconds
    - exaggeration: Optional[float] - exaggeration value
    - temperature: Optional[float] - temperature value
    """
    if not text or not isinstance(text, str):
        logger.warning("Received empty or invalid text input")
        return []
        
    logger.info(f"Parsing text: {text}")
    
    # First, find all markers and their positions
    markers = []
    for match in re.finditer(r'<(?:p|e|t)=(\d+(?:\.\d+)?)>', text):
        marker_type = match.group(0)[1]  # Get the type (p, e, or t)
        value = float(match.group(1))
        
        settings = {}
        if marker_type == 'p':
            settings['pause_ms'] = int(value)
        elif marker_type == 'e':
            settings['exaggeration'] = value
        elif marker_type == 't':
            settings['temperature'] = value
            
        markers.append((match.start(), match.end(), settings))
        logger.info(f"Found marker: {marker_type}={value} at position {match.start()}-{match.end()}")
    
    # Split text into parts based on marker positions
    result = []
    last_pos = 0
    
    for start, end, settings in markers:
        # Add text before marker if it's not empty
        text_part = text[last_pos:start].strip()
        if text_part:
            logger.info(f"Adding text part: '{text_part}'")
            result.append((text_part, {}))
        
        # Add marker settings
        logger.info(f"Adding marker with settings: {settings}")
        result.append(('', settings))
        last_pos = end
    
    # Add remaining text if any
    remaining_text = text[last_pos:].strip()
    if remaining_text:
        logger.info(f"Adding remaining text: '{remaining_text}'")
        result.append((remaining_text, {}))
    
    logger.info(f"Final parsed parts: {result}")
    return result 