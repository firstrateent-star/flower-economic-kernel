package com.flower.changedmethods.core;

import java.util.*;

public final class LineDiff {
    private LineDiff() {}

    public record Range(int startLine, int endLine) {
        public boolean overlaps(int start, int end) {
            return startLine <= end && start <= endLine;
        }
    }

    public static List<Range> changedNewLineRanges(String oldText, String newText, long maxCells) {
        String[] a = lines(oldText);
        String[] b = lines(newText);
        if (b.length == 0) return List.of();
        if (a.length == 0) return List.of(new Range(1, b.length));
        long cells = (long) (a.length + 1) * (b.length + 1);
        if (cells > maxCells) return List.of(new Range(1, b.length));
        int[][] dp = new int[a.length + 1][b.length + 1];
        for (int i = a.length - 1; i >= 0; i--) {
            for (int j = b.length - 1; j >= 0; j--) {
                dp[i][j] = a[i].equals(b[j]) ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
        boolean[] unchangedNew = new boolean[b.length];
        int i = 0, j = 0;
        while (i < a.length && j < b.length) {
            if (a[i].equals(b[j])) { unchangedNew[j] = true; i++; j++; }
            else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
            else j++;
        }
        List<Range> out = new ArrayList<>();
        int start = -1;
        for (int k = 0; k < unchangedNew.length; k++) {
            if (!unchangedNew[k] && start < 0) start = k + 1;
            boolean close = start > 0 && (unchangedNew[k] || k == unchangedNew.length - 1);
            if (close) {
                int end = unchangedNew[k] ? k : k + 1;
                out.add(new Range(start, end));
                start = -1;
            }
        }
        return out;
    }

    public static List<Range> changedNewLineRanges(String oldText, String newText) {
        return changedNewLineRanges(oldText, newText, 2_000_000L);
    }

    private static String[] lines(String text) {
        if (text == null || text.isEmpty()) return new String[0];
        return text.split("\\R", -1);
    }
}
