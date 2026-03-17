from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Dict

import requests
from gtts import gTTS

COUNTRIES = [
    "Afghánistán", "Albánie", "Alžírsko", "Andorra", "Angola",
    "Antigua a Barbuda", "Argentina", "Arménie", "Austrálie", "Ázerbájdžán",
    "Bahamy", "Bahrajn", "Bangladéš", "Barbados", "Belgie",
    "Belize", "Benin", "Bhútán", "Bělorusko", "Bolívie",
    "Bosna a Hercegovina", "Botswana", "Brazílie", "Brunej", "Bulharsko",
    "Burkina Faso", "Burundi", "Čad", "Černá Hora", "Česko",
    "Chile", "Chorvatsko", "Dánsko", "Dominika", "Dominikánská republika",
    "Džibutsko", "Egypt", "Ekvádor", "Eritrea", "Estonsko",
    "Etiopie", "Fidži", "Filipíny", "Finsko", "Francie",
    "Gabon", "Gambie", "Ghana", "Grenada", "Gruzie",
    "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
    "Honduras", "Indie", "Indonésie", "Irák", "Írán",
    "Irsko", "Island", "Itálie", "Izrael", "Jamajka",
    "Japonsko", "Jemen", "Jihoafrická republika", "Jižní Korea", "Jižní Súdán",
    "Jordánsko", "Kambodža", "Kamerun", "Kanada", "Kapverdy",
    "Katar", "Kazachstán", "Keňa", "Kiribati", "Kolumbie",
    "Komory", "Kongo", "Konžská demokratická republika", "Kosovo", "Kostarika",
    "Kuba", "Kuvajt", "Kypr", "Kyrgyzstán", "Laos",
    "Lesotho", "Libanon", "Libérie", "Libye", "Lichtenštejnsko",
    "Litva", "Lotyšsko", "Lucembursko", "Madagaskar", "Maďarsko",
    "Malajsie", "Malawi", "Maledivy", "Mali", "Malta",
    "Maroko", "Marshallovy ostrovy", "Mauricius", "Mauritánie", "Mexiko",
    "Mikronésie", "Moldavsko", "Monako", "Mongolsko", "Mosambik",
    "Myanmar", "Namibie", "Nauru", "Německo", "Nepál",
    "Niger", "Nigérie", "Nikaragua", "Nizozemsko", "Norsko",
    "Nový Zéland", "Omán", "Pákistán", "Palau", "Panama",
    "Papua-Nová Guinea", "Paraguay", "Peru", "Pobřeží slonoviny", "Polsko",
    "Portugalsko", "Rakousko", "Rovníková Guinea", "Rumunsko", "Rusko",
    "Rwanda", "Řecko", "Salvador", "Samoa", "San Marino",
    "Saúdská Arábie", "Severní Korea", "Severní Makedonie", "Senegal", "Seychely",
    "Sierra Leone", "Singapur", "Slovensko", "Slovinsko", "Somálsko",
    "Spojené arabské emiráty", "Spojené království", "Spojené státy", "Srbsko", "Srí Lanka",
    "Středoafrická republika", "Súdán", "Surinam", "Sýrie", "Svatá Lucie",
    "Svatý Kryštof a Nevis", "Svatý Vincenc a Grenadiny", "Svatý Tomáš a Princův ostrov", "Svazijsko", "Španělsko",
    "Švédsko", "Švýcarsko", "Tádžikistán", "Tanzanie", "Thajsko",
    "Togo", "Tonga", "Trinidad a Tobago", "Tunisko", "Turecko",
    "Turkmenistán", "Tuvalu", "Uganda", "Ukrajina", "Uruguay",
    "Uzbekistán", "Vanuatu", "Vatikán", "Venezuela", "Vietnam",
    "Východní Timor", "Zambie", "Zimbabwe"
]

ROOT = Path(__file__).resolve().parents[1]
FLAGS_DIR = ROOT / "public" / "flags"
AUDIO_DIR = ROOT / "public" / "audio" / "names"
DATA_FILE = ROOT / "src" / "data" / "flags.ts"

MANUAL_CODE_OVERRIDES = {
    "salvador": "sv",
    "svazijsko": "sz",
    "konzska demokraticka republika": "cd",
}


def normalize_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    no_accents = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    lowered = no_accents.lower()
    lowered = lowered.replace("-", " ")
    lowered = re.sub(r"[^a-z0-9 ]+", "", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def build_country_code_map() -> Dict[str, str]:
    response = requests.get(
        "https://restcountries.com/v3.1/all?fields=cca2,name,translations,altSpellings",
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()

    result: Dict[str, str] = {}

    for item in data:
        code = item.get("cca2", "").lower()
        if not code:
            continue

        names = []
        name_obj = item.get("name", {})
        translations = item.get("translations", {})
        cz = translations.get("ces", {})

        names.extend(
            [
                name_obj.get("common", ""),
                name_obj.get("official", ""),
                cz.get("common", ""),
                cz.get("official", ""),
            ]
        )
        names.extend(item.get("altSpellings", []))

        for raw in names:
            if not raw:
                continue
            result.setdefault(normalize_name(raw), code)

    result.update(MANUAL_CODE_OVERRIDES)
    return result


def download_flag(code: str) -> None:
    url = f"https://flagcdn.com/w320/{code}.png"
    target = FLAGS_DIR / f"{code}.png"
    if target.exists() and target.stat().st_size > 1000:
        return

    response = requests.get(url, timeout=60)
    response.raise_for_status()
    target.write_bytes(response.content)


def generate_audio(country_name: str, code: str) -> None:
    target = AUDIO_DIR / f"{code}.mp3"
    if target.exists() and target.stat().st_size > 1000:
        return

    tts = gTTS(text=country_name, lang="cs")
    tts.save(str(target))


def write_flags_data(entries: list[tuple[str, str]]) -> None:
    lines = [
        "export type FlagItem = {",
        "  id: string;",
        "  czechName: string;",
        "  imagePath: string;",
        "  audioPath: string;",
        "};",
        "",
        "// This file is auto-generated by scripts/generate_assets.py",
        "export const FLAGS: FlagItem[] = [",
    ]

    for code, name in entries:
        lines.append(
            f"  {{ id: '{code}', czechName: '{name}', imagePath: '/flags/{code}.png', audioPath: '/audio/names/{code}.mp3' }},"
        )

    lines.extend(
        [
            "];",
            "",
            "export const FEEDBACK_AUDIO = {",
            "  correct: '/audio/feedback/correct.mp3',",
            "  wrong: '/audio/feedback/wrong.mp3'",
            "};",
            "",
        ]
    )

    DATA_FILE.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    FLAGS_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    code_map = build_country_code_map()

    entries: list[tuple[str, str]] = []
    missing: list[str] = []

    for country in COUNTRIES:
        key = normalize_name(country)
        code = code_map.get(key)

        if not code:
            missing.append(country)
            continue

        download_flag(code)
        generate_audio(country, code)
        entries.append((code, country))

    unique_entries = []
    seen = set()
    for code, name in entries:
        if code in seen:
            continue
        seen.add(code)
        unique_entries.append((code, name))

    write_flags_data(unique_entries)

    print(f"Hotovo. Přidáno zemí: {len(unique_entries)}")
    if missing:
        print("Nenalezené země:")
        for item in missing:
            print(f"- {item}")


if __name__ == "__main__":
    main()
