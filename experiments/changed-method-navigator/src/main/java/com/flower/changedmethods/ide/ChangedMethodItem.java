package com.flower.changedmethods.ide;

public record ChangedMethodItem(String filePath, String methodName, int startOffset, int endOffset, int startLine, int endLine) {
    @Override public String toString() { return methodName + "  ·  " + filePath; }
}
