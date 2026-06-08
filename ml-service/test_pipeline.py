import requests
import wave
import struct
import json
import os

def run_test():
    # 1. Generate a tiny 1-second silent WAV file (16kHz mono, 16-bit PCM)
    wav_path = "test_temp.wav"
    with wave.open(wav_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2) # 16-bit
        w.setframerate(16000)
        # Write 1 second of silence (16000 zero samples)
        for _ in range(16000):
            data = struct.pack("<h", 0)
            w.writeframesraw(data)

    print(f"Generated temp WAV file: {wav_path} (size: {os.path.getsize(wav_path)} bytes)")

    # 2. Upload to the C# Backend API Session Controller
    url = "http://localhost:5094/api/sessions/upload"
    
    # Payload matching the Multipart Form fields
    data = {
        "userId": "88a38a7c-658a-4934-8cbf-4bfb621ffb8a",
        "question": "Tell me about a challenging technical project you built."
    }
    
    # Read file buffer
    with open(wav_path, "rb") as f:
        files = {
            "file": (wav_path, f, "audio/wav")
        }

        print(f"\nSending POST request to C# Web API: {url}...")
        try:
            response = requests.post(url, data=data, files=files, timeout=30)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code in [200, 201]:
                print("\n--- Success! E2E Pipeline Output Payload ---")
                print(json.dumps(response.json(), indent=2))
                print("--------------------------------------------\n")
            else:
                print(f"Upload failed: {response.text}")
                
        except Exception as e:
            print(f"Error connecting to backend server: {str(e)}")
            
    # Cleanup
    if os.path.exists(wav_path):
        os.remove(wav_path)
        print("Cleaned up temp WAV file.")

if __name__ == "__main__":
    run_test()
