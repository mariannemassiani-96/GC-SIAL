#!/usr/bin/env python3
"""
SIAL Smart Assembly — API Pick-to-Light

Deployer sur le Raspberry Pi 4 de l'atelier.
Controle les LEDs WS2812B via GPIO 18.

Cablage :
    GPIO 18 --[330 ohm]-->  WS2812B DATA IN
    GND     ------------>   WS2812B GND
    5V ext  --[1000uF]--->  WS2812B 5V + GND

Installation :
    pip3 install flask rpi_ws281x
    sudo python3 sial_picktolight.py
"""

import logging
from flask import Flask, jsonify, request

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
log = logging.getLogger('ptl')

# ── CONFIG ────────────────────────────────────────────────────────────

NB_LEDS    = 20
GPIO_PIN   = 18
LUMINOSITE = 128   # 0-255
PORT       = 8081

CASIER_LED = {
    1: 0,   # Cremones
    2: 1,   # Renvois d'angle
    3: 2,   # Compas / Bras de compas
    4: 3,   # Verrouillages
    5: 4,   # Verrouilleurs anti-decr.
    6: 5,   # Paliers / supports / douilles
    7: 6,   # Fiches intermediaires
    8: 7,   # Sachets rotation
    9: 8,   # Gaches galets dormant
    10: 9,  # Gaches tringles / Se
    11: 10, # Limiteurs / verrous
    12: 11, # Poignees
    13: 12, # Caches
    14: 13, # AFM
}

# ── INIT LEDs ─────────────────────────────────────────────────────────

try:
    from rpi_ws281x import PixelStrip, Color
    strip = PixelStrip(NB_LEDS, GPIO_PIN, 800000, 10, False, LUMINOSITE, 0)
    strip.begin()
    LEDS_OK = True
    log.info(f"LEDs WS2812B initialisees ({NB_LEDS} pixels, GPIO {GPIO_PIN})")
except Exception as e:
    LEDS_OK = False
    log.warning(f"LEDs non disponibles (simulation) : {e}")

LED_STATE = {i: {'on': False, 'color': '#000000'} for i in range(NB_LEDS)}

def hex_to_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c*2 for c in h)
    return int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)

def led_on(casier: int, hex_color: str):
    idx = CASIER_LED.get(casier)
    if idx is None: return False
    r, g, b = hex_to_rgb(hex_color)
    LED_STATE[idx] = {'on': True, 'color': hex_color}
    if LEDS_OK:
        strip.setPixelColor(idx, Color(r, g, b))
        strip.show()
    log.info(f"LED ON  casier={casier} pixel={idx} {hex_color}")
    return True

def led_off(casier: int):
    idx = CASIER_LED.get(casier)
    if idx is None: return False
    LED_STATE[idx] = {'on': False, 'color': '#000000'}
    if LEDS_OK:
        strip.setPixelColor(idx, Color(0, 0, 0))
        strip.show()
    log.info(f"LED OFF casier={casier}")
    return True

def led_all_off():
    for idx in range(NB_LEDS):
        LED_STATE[idx] = {'on': False, 'color': '#000000'}
    if LEDS_OK:
        for i in range(NB_LEDS): strip.setPixelColor(i, Color(0,0,0))
        strip.show()

def led_all_on(hex_color='#ffffff'):
    r, g, b = hex_to_rgb(hex_color)
    for idx in range(NB_LEDS):
        LED_STATE[idx] = {'on': True, 'color': hex_color}
    if LEDS_OK:
        for i in range(NB_LEDS): strip.setPixelColor(i, Color(r, g, b))
        strip.show()

# ── API ───────────────────────────────────────────────────────────────

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'leds_ok': LEDS_OK, 'nb_leds': NB_LEDS})

@app.route('/light/on', methods=['POST'])
def light_on():
    b = request.get_json(silent=True) or {}
    casier = b.get('casier')
    if casier is None: return jsonify({'error': 'casier requis'}), 400
    return jsonify({'ok': led_on(int(casier), b.get('color','#ffffff')), 'casier': casier})

@app.route('/light/off', methods=['POST'])
def light_off():
    b = request.get_json(silent=True) or {}
    casier = b.get('casier')
    if casier is None: return jsonify({'error': 'casier requis'}), 400
    return jsonify({'ok': led_off(int(casier))})

@app.route('/light/all/off', methods=['POST'])
def all_off():
    led_all_off(); return jsonify({'ok': True})

@app.route('/light/all/on', methods=['POST'])
def all_on():
    b = request.get_json(silent=True) or {}
    led_all_on(b.get('color','#ffffff')); return jsonify({'ok': True})

@app.route('/status')
def status():
    return jsonify({
        'leds_ok': LEDS_OK, 'nb_leds': NB_LEDS,
        'casiers': [{'casier': c, 'led': idx, **LED_STATE[idx]}
                     for c, idx in sorted(CASIER_LED.items())]
    })

@app.route('/config')
def config():
    return jsonify({'gpio_pin': GPIO_PIN, 'nb_leds': NB_LEDS,
                    'luminosite': LUMINOSITE, 'casier_led': CASIER_LED})

if __name__ == '__main__':
    log.info(f"SIAL Pick-to-Light -- port {PORT}")
    try:
        app.run(host='0.0.0.0', port=PORT, debug=False)
    finally:
        if LEDS_OK: led_all_off()
