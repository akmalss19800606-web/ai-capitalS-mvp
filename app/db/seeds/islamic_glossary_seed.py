"""
Seed data for islamic_glossary table.
50+ core Islamic finance terms (Arabic, transliteration, Russian, Uzbek).
"""
from sqlalchemy.orm import Session
from app.db.models.islamic_finance import IslamicGlossary

GLOSSARY_DATA = [
    {"term_arabic": "الربا", "transliteration": "Riba", "term_ru": "Ростовщичество", "term_uz": "Ribochi foiz", "definition": "Запрещённая надбавка при обмене или займе, включающая любой процент по кредиту.", "aaoifi_ref": "SS 3", "daleel": "Коран 2:275-279"},
    {"term_arabic": "المرابحة", "transliteration": "Murabaha", "term_ru": "Мурабаха", "term_uz": "Murobaha", "definition": "Продажа товара с объявленной наценкой. Банк покупает актив и перепродаёт клиенту с согласованной прибылью.", "aaoifi_ref": "FAS 2, SS 8", "daleel": "Коран 2:275"},
    {"term_arabic": "المضاربة", "transliteration": "Mudaraba", "term_ru": "Мудараба", "term_uz": "Mudaraba", "definition": "Партнёрство: одна сторона предоставляет капитал, другая — труд и управление.", "aaoifi_ref": "FAS 3, SS 13", "daleel": "Сунна"},
    {"term_arabic": "المشاركة", "transliteration": "Musharaka", "term_ru": "Мушарака", "term_uz": "Mushoraka", "definition": "Совместное партнёрство с разделением прибыли и убытков пропорционально вкладам.", "aaoifi_ref": "FAS 4, SS 12", "daleel": "Коран 38:24"},
    {"term_arabic": "الإجارة", "transliteration": "Ijara", "term_ru": "Иджара", "term_uz": "Ijara", "definition": "Аренда/лизинг актива. Арендодатель сохраняет право собственности.", "aaoifi_ref": "FAS 8, SS 9", "daleel": "Коран 28:26-27"},
    {"term_arabic": "السلم", "transliteration": "Salam", "term_ru": "Салям", "term_uz": "Salom", "definition": "Форвардная продажа: полная предоплата за товар с отложенной поставкой.", "aaoifi_ref": "FAS 7, SS 10", "daleel": "Хадис Бухари 2239"},
    {"term_arabic": "الاستصناع", "transliteration": "Istisna", "term_ru": "Истисна", "term_uz": "Istisno", "definition": "Договор на изготовление/строительство актива по спецификации заказчика.", "aaoifi_ref": "FAS 10, SS 11", "daleel": "Хадис Бухари"},
    {"term_arabic": "الصكوك", "transliteration": "Sukuk", "term_ru": "Сукук", "term_uz": "Sukuk", "definition": "Исламские облигации — сертификаты, удостоверяющие долю в реальном активе.", "aaoifi_ref": "FAS 17, SS 17", "daleel": "AAOIFI Standard 17"},
    {"term_arabic": "التكافل", "transliteration": "Takaful", "term_ru": "Такафуль", "term_uz": "Takaful", "definition": "Исламское страхование на основе взаимопомощи и солидарности участников.", "aaoifi_ref": "FAS 19, SS 26", "daleel": "Коран 5:2"},
    {"term_arabic": "الوقف", "transliteration": "Waqf", "term_ru": "Вакф", "term_uz": "Vaqf", "definition": "Благотворительный эндаумент: передача имущества на общественные цели навечно.", "aaoifi_ref": "SS 33", "daleel": "Хадис Муслим 1632"},
    {"term_arabic": "الزكاة", "transliteration": "Zakat", "term_ru": "Закят", "term_uz": "Zakot", "definition": "Обязательный налог-милостыня: 2.5% от накопленного богатства свыше нисаба.", "aaoifi_ref": "FAS 9, SS 35", "daleel": "Коран 2:43, 9:103"},
    {"term_arabic": "النصاب", "transliteration": "Nisab", "term_ru": "Нисаб", "term_uz": "Nisob", "definition": "Минимальный порог богатства для обязательности закята (85г золота или 595г серебра).", "aaoifi_ref": "SS 35", "daleel": "Хадис Бухари"},
    {"term_arabic": "الحول", "transliteration": "Hawl", "term_ru": "Хауль", "term_uz": "Havl", "definition": "Лунный год (354 дня) — период владения имуществом до обязательности закята.", "aaoifi_ref": "SS 35", "daleel": "Хадис Абу Дауд"},
    {"term_arabic": "الغرر", "transliteration": "Gharar", "term_ru": "Гарар", "term_uz": "G'aror", "definition": "Чрезмерная неопределённость в контракте. Запрещён в исламских финансах.", "aaoifi_ref": "SS 31", "daleel": "Хадис Муслим 1513"},
    {"term_arabic": "الميسر", "transliteration": "Maysir", "term_ru": "Майсир", "term_uz": "Maysir", "definition": "Азартные игры и спекуляции, запрещённые в исламе.", "aaoifi_ref": "SS 31", "daleel": "Коран 5:90-91"},
    {"term_arabic": "الحلال", "transliteration": "Halal", "term_ru": "Халяль", "term_uz": "Halol", "definition": "Дозволенное шариатом.", "aaoifi_ref": "", "daleel": "Коран 2:168"},
    {"term_arabic": "الحرام", "transliteration": "Haram", "term_ru": "Харам", "term_uz": "Harom", "definition": "Запрещённое шариатом.", "aaoifi_ref": "", "daleel": "Коран 2:173"},
    {"term_arabic": "الفتوى", "transliteration": "Fatwa", "term_ru": "Фатва", "term_uz": "Fatvo", "definition": "Религиозно-правовое заключение учёного по конкретному вопросу.", "aaoifi_ref": "GS 1", "daleel": "Коран 4:127"},
    {"term_arabic": "الشريعة", "transliteration": "Shariah", "term_ru": "Шариат", "term_uz": "Shariat", "definition": "Исламское право, основанное на Коране и Сунне.", "aaoifi_ref": "GS 1-7", "daleel": "Коран 45:18"},
    {"term_arabic": "الفقه", "transliteration": "Fiqh", "term_ru": "Фикх", "term_uz": "Fiqh", "definition": "Исламская юриспруденция — наука о практическом применении шариата.", "aaoifi_ref": "GS 1", "daleel": "Хадис Бухари"},
    {"term_arabic": "القرض الحسن", "transliteration": "Qard Hasan", "term_ru": "Кард Хасан", "term_uz": "Qarz Hasan", "definition": "Беспроцентный благотворительный заём.", "aaoifi_ref": "SS 19", "daleel": "Коран 2:245"},
    {"term_arabic": "الوكالة", "transliteration": "Wakala", "term_ru": "Вакала", "term_uz": "Vakola", "definition": "Агентский договор: уполномочивание представителя на совершение сделки.", "aaoifi_ref": "SS 23", "daleel": "Коран 18:19"},
    {"term_arabic": "الكفالة", "transliteration": "Kafala", "term_ru": "Кафала", "term_uz": "Kafola", "definition": "Поручительство/гарантия: обязательство третьей стороны.", "aaoifi_ref": "SS 5", "daleel": "Коран 12:72"},
    {"term_arabic": "الرهن", "transliteration": "Rahn", "term_ru": "Рахн", "term_uz": "Rahn", "definition": "Залог: обеспечение обязательства имуществом.", "aaoifi_ref": "SS 39", "daleel": "Коран 2:283"},
    {"term_arabic": "الحوالة", "transliteration": "Hawala", "term_ru": "Хавала", "term_uz": "Havola", "definition": "Перевод долга: передача обязательства от одного должника другому.", "aaoifi_ref": "SS 7", "daleel": "Хадис Бухари 2287"},
    {"term_arabic": "المقاصد", "transliteration": "Maqasid", "term_ru": "Макасид", "term_uz": "Maqosid", "definition": "Высшие цели шариата: защита веры, жизни, разума, потомства, имущества.", "aaoifi_ref": "GS 8", "daleel": "Аль-Газали, Аш-Шатиби"},
    {"term_arabic": "التورق", "transliteration": "Tawarruq", "term_ru": "Таваррук", "term_uz": "Tavarruq", "definition": "Монетизация: покупка товара в кредит и немедленная продажа за наличные третьему лицу.", "aaoifi_ref": "SS 30", "daleel": "Хадис"},
    {"term_arabic": "العربون", "transliteration": "Urbun", "term_ru": "Урбун", "term_uz": "Urbun", "definition": "Задаток при покупке, засчитываемый в цену при завершении сделки.", "aaoifi_ref": "SS 20", "daleel": "Хадис"},
    {"term_arabic": "البيع", "transliteration": "Bay", "term_ru": "Бай (купля-продажа)", "term_uz": "Bay (oldi-sotdi)", "definition": "Обмен имущества на имущество по взаимному согласию.", "aaoifi_ref": "SS 8", "daleel": "Коран 2:275"},
    {"term_arabic": "الوديعة", "transliteration": "Wadiah", "term_ru": "Вадиа", "term_uz": "Vadia", "definition": "Хранение: передача имущества на ответственное хранение.", "aaoifi_ref": "SS 22", "daleel": "Коран 4:58"},
    {"term_arabic": "الأمانة", "transliteration": "Amana", "term_ru": "Амана", "term_uz": "Omona", "definition": "Доверительное хранение; ответственность без гарантии возврата.", "aaoifi_ref": "GS 5", "daleel": "Коран 33:72"},
    {"term_arabic": "التجارة", "transliteration": "Tijara", "term_ru": "Тиджара", "term_uz": "Tijorat", "definition": "Торговля, коммерция — дозволенный вид заработка.", "aaoifi_ref": "", "daleel": "Коран 4:29"},
    {"term_arabic": "الإحسان", "transliteration": "Ihsan", "term_ru": "Ихсан", "term_uz": "Ehson", "definition": "Совершенствование и благодеяние в поступках и намерениях.", "aaoifi_ref": "", "daleel": "Хадис Джибрила"},
    {"term_arabic": "العدل", "transliteration": "Adl", "term_ru": "Адль (справедливость)", "term_uz": "Adl (adolat)", "definition": "Справедливость — фундаментальный принцип всех исламских транзакций.", "aaoifi_ref": "GS 8", "daleel": "Коран 16:90"},
    {"term_arabic": "المصلحة", "transliteration": "Maslaha", "term_ru": "Маслаха", "term_uz": "Maslahat", "definition": "Общественная польза, учитываемая при принятии шариатских решений.", "aaoifi_ref": "GS 8", "daleel": "Аш-Шатиби"},
    {"term_arabic": "التيسير", "transliteration": "Taysir", "term_ru": "Тайсир", "term_uz": "Taysir", "definition": "Принцип облегчения в шариате.", "aaoifi_ref": "", "daleel": "Коран 2:185"},
    {"term_arabic": "الضرورة", "transliteration": "Darura", "term_ru": "Дарура", "term_uz": "Zarurat", "definition": "Крайняя необходимость, допускающая временное отступление от запрета.", "aaoifi_ref": "GS 5", "daleel": "Коран 2:173"},
    {"term_arabic": "الصدقة", "transliteration": "Sadaqa", "term_ru": "Садака", "term_uz": "Sadaqa", "definition": "Добровольная милостыня сверх обязательного закята.", "aaoifi_ref": "", "daleel": "Коран 2:271"},
    {"term_arabic": "الخمس", "transliteration": "Khums", "term_ru": "Хумс", "term_uz": "Xums", "definition": "Пятая часть (20%) определённых видов дохода.", "aaoifi_ref": "", "daleel": "Коран 8:41"},
    {"term_arabic": "البركة", "transliteration": "Baraka", "term_ru": "Барака", "term_uz": "Baraka", "definition": "Благодать, благословение в имуществе и делах.", "aaoifi_ref": "", "daleel": "Коран 7:96"},
    {"term_arabic": "الجعالة", "transliteration": "Juala", "term_ru": "Джуала", "term_uz": "Juola", "definition": "Вознаграждение за выполнение определённой работы.", "aaoifi_ref": "SS 15", "daleel": "Коран 12:72"},
    {"term_arabic": "المزارعة", "transliteration": "Muzara'a", "term_ru": "Музараа", "term_uz": "Muzoraa", "definition": "Партнёрство в земледелии: одна сторона даёт землю, другая — труд.", "aaoifi_ref": "SS 24", "daleel": "Хадис Бухари"},
    {"term_arabic": "المساقاة", "transliteration": "Musaqat", "term_ru": "Мусакат", "term_uz": "Musoqot", "definition": "Партнёрство в садоводстве с разделением урожая.", "aaoifi_ref": "SS 24", "daleel": "Хадис Муслим"},
    {"term_arabic": "هيئة الرقابة الشرعية", "transliteration": "Hay'at ar-Raqaba", "term_ru": "Шариатский наблюдательный совет", "term_uz": "Shariatiy kuzatuv kengashi", "definition": "Орган при финансовом учреждении, контролирующий соответствие операций шариату.", "aaoifi_ref": "GS 1-7", "daleel": "AAOIFI GS 1"},
    {"term_arabic": "التطهير", "transliteration": "Tathir", "term_ru": "Тат-хир (очистка)", "term_uz": "Tozalash", "definition": "Очистка дохода от харамной составляющей путём передачи в благотворительность.", "aaoifi_ref": "SS 21", "daleel": "Фатвы SSB"},
    {"term_arabic": "النسبة المالية", "transliteration": "Nisba Maliyya", "term_ru": "Финансовый коэффициент", "term_uz": "Moliyaviy koeffitsient", "definition": "Количественный показатель для шариатского скрининга (долг/активы, и т.д.).", "aaoifi_ref": "SS 21", "daleel": "AAOIFI SS 21"},
    {"term_arabic": "المؤشر الشرعي", "transliteration": "Mu'ashshir Shar'i", "term_ru": "Шариатский индекс", "term_uz": "Shariatiy indeks", "definition": "Фондовый индекс, включающий только шариат-совместимые акции.", "aaoifi_ref": "", "daleel": "DJIM, S&P Shariah"},
    {"term_arabic": "الضمان", "transliteration": "Daman", "term_ru": "Даман", "term_uz": "Damon", "definition": "Гарантия/ответственность за возмещение убытков.", "aaoifi_ref": "SS 5", "daleel": "Хадис"},
    {"term_arabic": "الشركة", "transliteration": "Sharika", "term_ru": "Ширка (партнёрство)", "term_uz": "Shirkat", "definition": "Общее понятие партнёрства/компании в исламском праве.", "aaoifi_ref": "SS 12", "daleel": "Коран 38:24"},
    {"term_arabic": "الإسراف", "transliteration": "Israf", "term_ru": "Исраф (расточительство)", "term_uz": "Isrof", "definition": "Расточительство, запрещённое в исламе.", "aaoifi_ref": "", "daleel": "Коран 7:31"},
]


def seed_glossary(db: Session):
    """Insert glossary terms if table is empty."""
    count = db.query(IslamicGlossary).count()
    if count > 0:
        return f"islamic_glossary already has {count} rows, skipping."
    for item in GLOSSARY_DATA:
        db.add(IslamicGlossary(**item))
    db.commit()
    return f"Seeded {len(GLOSSARY_DATA)} glossary terms."
