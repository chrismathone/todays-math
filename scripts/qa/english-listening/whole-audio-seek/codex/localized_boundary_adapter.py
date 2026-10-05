"""Explicit next-END tier; it never relaxes the candidate's original seek start."""
import localized_adapter as localized

ADAPTER = localized.END_BOUNDARY_ADAPTER


def validate(row, source, question, clock, replay, full_index):
    return localized.validate(row, source, question, clock, replay, full_index, end_boundary_only=True)
