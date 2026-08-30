package com.flower.changedmethods.core;

import java.util.*;

public final class SymbolOverlap {
    private SymbolOverlap() {}
    public record SymbolRange(String name, int startLine, int endLine) {}
    public static List<SymbolRange> changedSymbols(List<SymbolRange> symbols, List<LineDiff.Range> changedRanges) {
        List<SymbolRange> out = new ArrayList<>();
        for (SymbolRange symbol : symbols) {
            for (LineDiff.Range change : changedRanges) {
                if (change.overlaps(symbol.startLine(), symbol.endLine())) { out.add(symbol); break; }
            }
        }
        out.sort(Comparator.comparingInt(SymbolRange::startLine));
        return out;
    }
}
