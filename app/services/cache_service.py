"""
cache_service.py — Tasks 81-90: In-memory caching for OLAP analytics endpoints.
Simple TTL cache using Python dict (no Redis dependency required).
"""
from __future__ import annotations
import time
import json
import hashlib
from functools import wraps
from typing import Any, Callable, Optional

_CACHE: dict[str, tuple[float, Any]] = {}
DEFAULT_TTL = 300  # 5 minutes


def _make_key(*args, **kwargs) -> str:
    """Generate a cache key from args/kwargs."""
    raw = json.dumps({'args': str(args), 'kwargs': str(sorted(kwargs.items()))},
                     sort_keys=True, default=str)
    return hashlib.md5(raw.encode()).hexdigest()


def cache_get(key: str) -> Optional[Any]:
    """Get a cached value. Returns None if expired or not found."""
    if key in _CACHE:
        ts, val = _CACHE[key]
        if time.time() - ts < DEFAULT_TTL:
            return val
        del _CACHE[key]
    return None


def cache_set(key: str, value: Any, ttl: int = DEFAULT_TTL) -> None:
    """Store a value in cache."""
    _CACHE[key] = (time.time(), value)


def cache_delete(key: str) -> None:
    """Remove a cache entry."""
    _CACHE.pop(key, None)


def cache_clear() -> int:
    """Clear all cache entries. Returns count cleared."""
    count = len(_CACHE)
    _CACHE.clear()
    return count


def cache_stats() -> dict:
    """Return cache statistics."""
    now = time.time()
    valid = sum(1 for ts, _ in _CACHE.values() if now - ts < DEFAULT_TTL)
    expired = len(_CACHE) - valid
    return {
        'total_entries': len(_CACHE),
        'valid_entries': valid,
        'expired_entries': expired,
        'ttl_seconds': DEFAULT_TTL,
    }


def cached(ttl: int = DEFAULT_TTL):
    """Decorator: cache function result by arguments."""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{func.__module__}.{func.__name__}:{_make_key(*args, **kwargs)}"
            result = cache_get(key)
            if result is not None:
                return result
            result = func(*args, **kwargs)
            cache_set(key, result, ttl)
            return result
        return wrapper
    return decorator


def invalidate_olap_cache() -> int:
    """Task 88-90: Invalidate all OLAP-related cache entries."""
    keys_to_delete = [k for k in list(_CACHE.keys())
                      if 'olap' in k.lower() or 'analytics' in k.lower() or 'report' in k.lower()]
    for k in keys_to_delete:
        del _CACHE[k]
    return len(keys_to_delete)
