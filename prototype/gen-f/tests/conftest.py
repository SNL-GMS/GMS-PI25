try:
    pass
except:
    print(
        "Error: genf not installed.  Run 'pip install -e .' from the root directory of the repository before running tests"
    )
    import sys

    sys.exit(-1)
