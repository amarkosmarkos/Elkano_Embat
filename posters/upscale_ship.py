"""One authorized Topaz precision upscale. No embedded credentials or POST retries."""
import getpass
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LOG = ROOT / 'upscale-receipts'
LOG.mkdir(exist_ok=True)
MODEL = 'topaz/upscale/image/precision'
PAYLOAD = {
    'image_url': 'https://raw.githubusercontent.com/amarkosmarkos/Elkano_Embat/xubranch/posters/assets/ship-slide1-5p75s.png',
    'model': 'High Fidelity V3',
    'upscale_factor': 4,
    'output_format': 'png',
    'face_enhancement': False,
    'subject_detection': 'All',
    'crop_to_fill': False,
}

def main():
    key = getpass.getpass('FAL key (hidden): ')
    def request(url, payload=None):
        assert url.startswith('https://queue.fal.run/')
        data = None if payload is None else json.dumps(payload).encode()
        req = urllib.request.Request(url, data=data, headers={
            'Authorization': 'Key ' + key, 'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=90) as response:
            return json.load(response)
    receipt = LOG / 'ship-topaz4x-request.json'
    result_path = LOG / 'ship-topaz4x-result.json'
    if result_path.exists():
        result = json.loads(result_path.read_text())
    else:
        if receipt.exists():
            info = json.loads(receipt.read_text())['submission']
        else:
            marker = LOG / 'ship-topaz4x-started.json'
            if marker.exists():
                raise RuntimeError('Previous POST outcome unknown. Inspect fal before resubmitting.')
            marker.write_text(json.dumps({'model': MODEL, 'input': PAYLOAD}, indent=2))
            info = request('https://queue.fal.run/' + MODEL, PAYLOAD)
            receipt.write_text(json.dumps({'model': MODEL, 'input': PAYLOAD, 'submission': info}, indent=2))
        print('REQUEST', info['request_id'], flush=True)
        for _ in range(120):
            status = request(info['status_url'])
            print('STATUS', status['status'], flush=True)
            if status['status'] == 'COMPLETED':
                result = request(info['response_url'])
                result_path.write_text(json.dumps(result, indent=2))
                break
            time.sleep(10)
        else:
            raise RuntimeError('Still processing. Resume this script without a new POST.')
    url = result['image']['url']
    assert url.startswith('https://')
    target = ROOT / 'assets/ship-slide1-5p75s-topaz4x.png'
    if not target.exists():
        with urllib.request.urlopen(url, timeout=120) as response:
            target.write_bytes(response.read())
    from PIL import Image
    with Image.open(target) as im:
        assert im.size == (5120, 2880), im.size
        im.verify()
    print('VERIFIED', target, flush=True)

if __name__ == '__main__':
    main()
