import numpy as np
import pytest
from numpy.testing import assert_allclose

from genf import LongTermAverage


def test_lta():
    lta_length = 240
    lta_gap = 5
    lta = LongTermAverage(1.0, lta_length, lta_gap, 0, False)
    for i in range(1000):
        lta.update(i)
    assert lta.active
    assert_allclose(lta.buffer, np.arange(995.0, 1000.0))
    assert pytest.approx(lta.value) == 760.108704
