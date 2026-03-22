from app.db.seeds.islamic_glossary_seed import seed_glossary
from app.db.seeds.haram_industries_seed import seed_haram_industries

def run_islamic_seeds(db):
    """Run all Islamic finance seed functions."""
    results = []
    results.append(seed_glossary(db))
    results.append(seed_haram_industries(db))
    return results
