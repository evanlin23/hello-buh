# a shim: openai-whisper's API on faster-whisper (no torch download)
import numpy as np, subprocess
from faster_whisper import WhisperModel
def load_audio(p, sr=16000):
    return np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar',str(sr),'-f','f32le','-'],capture_output=True).stdout,np.float32).copy()
class _M:
    def __init__(s, name): s.m = WhisperModel(name, device='cpu', compute_type='int8')
    def transcribe(s, x, language='en', fp16=False, word_timestamps=False, **k):
        segs,_ = s.m.transcribe(x, language=language, word_timestamps=word_timestamps)
        out=[]; txt=[]
        for g in segs:
            d={'text':g.text,'start':g.start,'end':g.end}
            if word_timestamps: d['words']=[{'word':w.word,'start':w.start,'end':w.end} for w in g.words]
            out.append(d); txt.append(g.text)
        return {'segments':out,'text':''.join(txt)}
def load_model(name): return _M(name)
