import os
import numpy as np
import librosa
import soundfile as sf
from typing import Dict, Any

def extract_audio_features(file_path: str) -> Dict[str, Any]:
    """
    Extracts various acoustic features from a audio file.
    Includes: MFCCs, Chroma, Spectral Centroid, Spectral Bandwidth, Zero Crossing Rate,
    RMS Energy, Pitch (mean & stability), Jitter, Shimmer, Speech Rate, and Pauses.
    """
    # Load audio (downsampled to 16kHz mono)
    y, sr = librosa.load(file_path, sr=16000)
    
    # Duration in seconds
    duration = librosa.get_duration(y=y, sr=sr)
    if duration == 0:
        raise ValueError("Audio duration is 0 seconds.")

    # 1. RMS Energy
    rms = librosa.feature.rms(y=y)
    rms_mean = float(np.mean(rms))
    rms_std = float(np.std(rms))

    # 2. Zero Crossing Rate
    zcr = librosa.feature.zero_crossing_rate(y=y)
    zcr_mean = float(np.mean(zcr))

    # 3. Spectral Centroid
    spec_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    centroid_mean = float(np.mean(spec_centroid))

    # 4. Spectral Bandwidth
    spec_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
    bandwidth_mean = float(np.mean(spec_bandwidth))

    # 5. Chroma Features (12 pitch classes)
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    chroma_mean = float(np.mean(chroma))
    chroma_std = float(np.std(chroma))

    # 6. MFCCs (Mel-frequency cepstral coefficients - 13 coefficients)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_means = [float(val) for val in np.mean(mfcc, axis=1)]
    mfcc_stds = [float(val) for val in np.std(mfcc, axis=1)]

    # 7. Pitch (YIN algorithm is more stable for fundamental frequency tracking)
    try:
        # F0 range for human speech is typically 50Hz to 400Hz
        f0 = librosa.yin(y=y, sr=sr, fmin=50, fmax=400)
        # Filter out unvoiced frames (nan or zero)
        f0_clean = f0[~np.isnan(f0)]
        f0_clean = f0_clean[f0_clean > 0]
        
        if len(f0_clean) > 0:
            pitch_mean = float(np.mean(f0_clean))
            pitch_std = float(np.std(f0_clean))
            pitch_stability = 100.0 - min(100.0, (pitch_std / pitch_mean) * 100.0) if pitch_mean > 0 else 0.0
        else:
            pitch_mean = 120.0  # Default male/female average fallback
            pitch_std = 20.0
            pitch_stability = 80.0
    except Exception:
        pitch_mean = 120.0
        pitch_std = 20.0
        pitch_stability = 80.0
        f0_clean = np.array([])

    # 8. Jitter and Shimmer Approximations
    # Jitter (frequency instability) - average absolute difference between consecutive fundamental periods
    if len(f0_clean) > 1:
        # fundamental periods T = 1 / f0
        periods = 1.0 / f0_clean
        jitter = float(np.mean(np.abs(np.diff(periods))) / np.mean(periods))
    else:
        jitter = 0.015  # Fallback baseline

    # Shimmer (amplitude instability) - average absolute difference between consecutive peak amplitudes
    # We approximate this using peak RMS envelope differences
    rms_flat = rms[0]
    if len(rms_flat) > 1:
        shimmer = float(np.mean(np.abs(np.diff(rms_flat))) / (np.mean(rms_flat) + 1e-6))
    else:
        shimmer = 0.03  # Fallback baseline

    # 9. Speech Rate and Pauses
    # Use energy threshold to find voiced/unvoiced sections
    # Split audio by silence (top_db is the threshold below reference, e.g., 25dB)
    intervals = librosa.effects.split(y, top_db=25)
    
    speech_duration = 0.0
    for start, end in intervals:
        speech_duration += (end - start) / sr
        
    non_speech_duration = max(0.0, duration - speech_duration)
    
    # A pause is a silent interval between speech blocks
    # We count silent gaps longer than 0.3s
    pause_count = 0
    pause_durations = []
    
    if len(intervals) > 1:
        for i in range(len(intervals) - 1):
            pause_start = intervals[i][1] / sr
            pause_end = intervals[i+1][0] / sr
            gap = pause_end - pause_start
            if gap > 0.3:
                pause_count += 1
                pause_durations += [gap]
                
    total_pause_duration = sum(pause_durations)
    mean_pause_duration = float(np.mean(pause_durations)) if len(pause_durations) > 0 else 0.0
    
    # Estimate syllable count to get speaking rate (words/syllables per minute)
    # Simple syllable counts using peak detection in the amplitude envelope
    # Smooth RMS to get intensity envelope
    envelope = np.interp(np.arange(len(y)), np.arange(len(rms_flat)) * (len(y)/len(rms_flat)), rms_flat)
    peaks, _ = librosa.util.peak_pick(
        envelope, 
        pre_max=int(sr * 0.05), 
        post_max=int(sr * 0.05), 
        pre_avg=int(sr * 0.1), 
        post_avg=int(sr * 0.1), 
        delta=0.01, 
        wait=int(sr * 0.1)
    )
    syllables = len(peaks)
    
    # Speaking rate in syllables per second
    speaking_rate = float(syllables / duration) if duration > 0 else 0.0
    
    # Normal speaking rate is ~2-4 syllables/sec. Words per minute (WPM) is approx speaking_rate * 60 / 1.5
    wpm = (syllables / 1.3) * (60.0 / duration) if duration > 0 else 0.0
    
    return {
        "duration_seconds": float(duration),
        "rms_energy_mean": rms_mean,
        "rms_energy_std": rms_std,
        "zero_crossing_rate": zcr_mean,
        "spectral_centroid": centroid_mean,
        "spectral_bandwidth": bandwidth_mean,
        "chroma_mean": chroma_mean,
        "chroma_std": chroma_std,
        "mfcc_means": mfcc_means,
        "mfcc_stds": mfcc_stds,
        "pitch_mean_hz": pitch_mean,
        "pitch_std_hz": pitch_std,
        "pitch_stability": pitch_stability,
        "jitter": jitter,
        "shimmer": shimmer,
        "speaking_rate_syllables_sec": speaking_rate,
        "estimated_wpm": float(wpm),
        "pause_count": pause_count,
        "pause_duration_seconds": total_pause_duration,
        "mean_pause_duration": mean_pause_duration,
    }
