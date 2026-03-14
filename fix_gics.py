import sys, re

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Новый GICS массив с правильной кириллицей
GICS_CLEAN = '''const GICS=[
{v:"wholesale_flour",l:"Оптовая торговля мукой",g:"Consumer Staples"},
{v:"retail_food",l:"Розничная торговля продуктами",g:"Consumer Staples"},
{v:"textile",l:"Текстильное производство",g:"Consumer Discretionary"},
{v:"construction",l:"Строительство жилых зданий",g:"Industrials"},
{v:"it_software",l:"IT-услуги и разработка ПО",g:"Information Technology"},
{v:"pharma",l:"Фармацевтика",g:"Health Care"},
{v:"agriculture",l:"Сельское хозяйство",g:"Consumer Staples"},
{v:"logistics",l:"Логистика и транспорт",g:"Industrials"},
{v:"banking",l:"Банковские услуги",g:"Financials"},
{v:"insurance",l:"Страхование",g:"Financials"},
{v:"energy",l:"Энергетика",g:"Utilities"},
{v:"mining",l:"Горнодобывающая промышленность",g:"Materials"},
{v:"food_processing",l:"Пищевая промышленность",g:"Consumer Staples"},
{v:"chemical",l:"Химическая промышленность",g:"Materials"},
{v:"metallurgy",l:"Металлургия",g:"Materials"},
{v:"tourism",l:"Туризм и гостиницы",g:"Consumer Discretionary"},
{v:"education",l:"Образование",g:"Consumer Discretionary"},
{v:"healthcare",l:"Здравоохранение",g:"Health Care"},
{v:"telecom",l:"Телекоммуникации",g:"Communication Services"},
{v:"real_estate",l:"Недвижимость",g:"Real Estate"},
{v:"automotive",l:"Автомобильная отрасль",g:"Consumer Discretionary"},
{v:"electronics",l:"Электроника",g:"Information Technology"},
{v:"furniture",l:"Мебельное производство",g:"Consumer Discretionary"},
{v:"light_industry",l:"Лёгкая промышленность",g:"Consumer Discretionary"},
{v:"oil_gas",l:"Нефть и газ",g:"Energy"},
];'''

# Находим старый GICS массив: от "const GICS=[" до "];"
pattern = r'const GICS\s*=\s*\[.*?\];'
match = re.search(pattern, text, re.DOTALL)
if match:
    text = text[:match.start()] + GICS_CLEAN + text[match.end():]
    print("GICS replaced OK")
else:
    print("GICS pattern not found!")

# Также исправляем названия в STEPS если есть битая кириллица
# Заменяем все битые названия секторов в кнопках сравнения
# (они генерируются из GICS, поэтому исправятся автоматически)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)
print("File saved, size:", len(text))