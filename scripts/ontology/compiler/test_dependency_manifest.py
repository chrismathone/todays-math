"""Offline dependency parsing with a function package's isolated filesystem."""

import tempfile
import unittest
from pathlib import Path

from pip._internal.exceptions import InstallationError
from pip._internal.network.session import PipSession
from pip._internal.req.req_file import parse_requirements


ROOT = Path(__file__).resolve().parents[3]
LOCK = ROOT / "scripts/ontology/compiler/requirements.lock"


def parse_isolated_manifest(content):
    # A function's excludes can remove scripts/ontology. Only its root manifest
    # is available here; parsing must not depend on the checkout or use a network.
    with tempfile.TemporaryDirectory(prefix="ontology-requirements-") as folder:
        path = Path(folder) / "requirements.txt"
        path.write_text(content, encoding="utf-8")
        with PipSession() as session:
            return [item.requirement for item in parse_requirements(str(path), session=session)]


class OntologyDependencyManifest(unittest.TestCase):
    def test_root_manifest_keeps_every_exact_compiler_lock_pin(self):
        lock = LOCK.read_text(encoding="utf-8").splitlines()
        deployed = (ROOT / "requirements.txt").read_text(encoding="utf-8").splitlines()
        self.assertEqual(deployed, lock)
        self.assertEqual(len(lock), 11)
        self.assertEqual(len({line.split("==")[0].lower() for line in lock}), len(lock))
        for line in deployed:
            self.assertRegex(line, r"^[A-Za-z0-9_.-]+==[0-9]+(?:\.[0-9]+)+$")

    def test_root_manifest_parses_with_no_compiler_directory(self):
        parsed = parse_isolated_manifest((ROOT / "requirements.txt").read_text(encoding="utf-8"))
        self.assertEqual(parsed, LOCK.read_text(encoding="utf-8").splitlines())

    def test_original_include_fails_when_function_excludes_its_target(self):
        with self.assertRaises(InstallationError):
            parse_isolated_manifest("-r scripts/ontology/compiler/requirements.lock\n")


if __name__ == "__main__":
    unittest.main()
