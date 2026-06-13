import urllib.request
import re
import json
import sys
from html.parser import HTMLParser

# Configure stdout to handle UTF-8 printing
sys.stdout.reconfigure(encoding='utf-8')

url = "https://en.wikipedia.org/wiki/List_of_Mumbai_Suburban_Railway_stations"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
    print("Fetched HTML successfully, length:", len(html))
except Exception as e:
    print("Error fetching page:", e)
    html = ""

class WikiTableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.current_cell_data = []
        self.current_row_cells = []
        self.tables = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'table':
            classes = attrs_dict.get('class', '')
            if 'wikitable' in classes:
                self.in_table = True
                self.tables.append([])
        elif tag == 'tr' and self.in_table:
            self.in_row = True
            self.current_row_cells = []
        elif tag in ('td', 'th') and self.in_row:
            self.in_cell = True
            colspan = int(attrs_dict.get('colspan', 1))
            rowspan = int(attrs_dict.get('rowspan', 1))
            self.current_cell_data = []
            self.current_cell_meta = {'colspan': colspan, 'rowspan': rowspan}

    def handle_endtag(self, tag):
        if tag == 'table' and self.in_table:
            self.in_table = False
        elif tag == 'tr' and self.in_row:
            self.in_row = False
            if self.tables:
                self.tables[-1].append(self.current_row_cells)
        elif tag in ('td', 'th') and self.in_cell:
            self.in_cell = False
            cell_text = "".join(self.current_cell_data).strip()
            cell_text = re.sub(r'\[\d+\]', '', cell_text) # remove references
            cell_text = re.sub(r'\s+', ' ', cell_text) # normalize space
            self.current_row_cells.append({
                'text': cell_text,
                'colspan': self.current_cell_meta['colspan'],
                'rowspan': self.current_cell_meta['rowspan']
            })

    def handle_data(self, data):
        if self.in_cell:
            self.current_cell_data.append(data)

def extract_best_code(raw_code):
    # Split by slash, comma, space, hyphen
    parts = re.split(r'[/,\s\-\\–]', raw_code)
    # Clean tokens to only uppercase letters and numbers
    cleaned_parts = []
    for p in parts:
        c = re.sub(r'[^A-Z0-9]', '', p.upper())
        if c:
            cleaned_parts.append(c)
            
    if not cleaned_parts:
        return ""
        
    # Prioritize 3 or 4 letter codes (standard IRCTC codes)
    for p in cleaned_parts:
        if len(p) in (3, 4):
            return p
            
    # Then check 2-letter codes (e.g. DR, VR, DI)
    for p in cleaned_parts:
        if len(p) == 2:
            return p
            
    # Then length 5
    for p in cleaned_parts:
        if len(p) == 5:
            return p
            
    return cleaned_parts[0]

if html:
    parser = WikiTableParser()
    parser.feed(html)
    
    if len(parser.tables) > 1:
        table = parser.tables[1]
        grid = []
        for r_idx, row in enumerate(table):
            while len(grid) <= r_idx:
                grid.append([])
            c_idx = 0
            for cell in row:
                while c_idx < len(grid[r_idx]) and grid[r_idx][c_idx] is not None:
                    c_idx += 1
                colspan = cell['colspan']
                rowspan = cell['rowspan']
                text = cell['text']
                for r_offset in range(rowspan):
                    target_r = r_idx + r_offset
                    while len(grid) <= target_r:
                        grid.append([])
                    for c_offset in range(colspan):
                        target_c = c_idx + c_offset
                        while len(grid[target_r]) <= target_c:
                            grid[target_r].append(None)
                        grid[target_r][target_c] = text
                c_idx += colspan
        
        stations_list = []
        for row in grid[2:]:
            if len(row) >= 8:
                english_name = row[0].strip()
                marathi_name = row[1].strip()
                raw_code = row[2].strip()
                lines_str = row[3].strip()
                district = row[7].strip() if len(row) > 7 else ""
                
                # Check for footnotes/parenthesis in English Name
                english_name_clean = re.sub(r'\(.*?\)', '', english_name).strip()
                english_name_clean = re.sub(r'\*.*', '', english_name_clean).strip()
                
                best_code = extract_best_code(raw_code)
                
                # Special corrections for major stations to match IRCTC perfectly
                special_cases = {
                    "Chhatrapati Shivaji Maharaj Terminus": "CSTM",
                    "Mumbai Central": "MMCT",
                    "Andheri": "ADH",
                    "Borivali": "BVI",
                    "Vasai Road": "BSR",
                    "Vashi": "VSH",
                    "Wadala Road": "VDLR",
                    "Kurla": "CLA",
                    "Dadar": "DR",  # In Central/Western, DR/DDR
                    "Bandra": "BA",
                    "Bandra Terminus": "BDTS",
                    "Nerul": "NEU",
                    "Belapur": "BEPR", # CBD Belapur
                    "Kharghar": "KHAG",
                    "Kharkopar": "KARP",
                    "Mansarovar": "MANR",
                    "Khandeshwar": "KNDS",
                    "Seawoods-Darave-Karave": "SWDV",
                    "Seawoods–Darave": "SWDV",
                    "Guru Tegh Bahadur Nagar": "GTBN",
                    "Lower Parel": "PL",
                    "Lower Parel Local": "PL",
                    "Mahalaxmi": "MX",
                    "Prabhadevi": "PBHD",
                    "Matunga Road": "MRU",
                    "Matunga": "MTN",
                    "Elphinstone Road": "EPR",
                    "Sandhurst Road": "SNRD",
                    "Cotton Green": "CTGN",
                    "Dockyard Road": "DKRD",
                    "King's Circle": "KCE",
                    "Reay Road": "RRD",
                    "Sewri": "SVE",
                    "Tilak Nagar": "TKNG",
                    "Chembur": "CMBR",
                    "Govandi": "GV",
                    "Mankhurd": "MNKD",
                    "Sanpada": "SNCR",
                    "Juinagar": "JNJ",
                    "Seawoods–Darave–Karave": "SWDV",
                    "CBD Belapur": "BEPR",
                    "Khar Road": "KHAR",
                    "Jogeshwari": "JOS",
                    "Ram Mandir": "RMAR",
                    "Goregaon": "GMN",
                    "Malad": "MDD",
                    "Kandivli": "KILE",
                    "Dahisar": "DIC",
                    "Naigaon": "NIG",
                    "Nallasopara": "NSP",
                    "Virar": "VR",
                    "Bhayandar": "BYR",
                    "Vangaon": "VGN",
                    "Vangani": "VGI",
                }
                
                if english_name_clean in special_cases:
                    best_code = special_cases[english_name_clean]
                elif english_name in special_cases:
                    best_code = special_cases[english_name]
                
                # Check for Dadar specific names
                if "Dadar" in english_name_clean:
                    best_code = "DR"
                
                if best_code:
                    stations_list.append({
                        "name": english_name_clean,
                        "code": best_code,
                        "lines": lines_str,
                        "district": district
                    })
        
        print(f"Extracted {len(stations_list)} stations with smart code selection!")
        # Let's inspect some parsed stations to verify
        for s in stations_list[:15]:
            print(f"  {s['name']} -> Code: {s['code']} (Lines: {s['lines']})")
            
        with open("mumbai_suburban_stations.json", "w", encoding="utf-8") as f:
            json.dump(stations_list, f, indent=2, ensure_ascii=False)
        print("Successfully written to mumbai_suburban_stations.json")
