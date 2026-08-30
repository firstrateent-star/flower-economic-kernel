package com.flower.changedmethods.ide;

import com.flower.changedmethods.core.LineDiff;
import com.flower.changedmethods.core.SymbolOverlap;
import com.intellij.openapi.editor.Document;
import com.intellij.psi.PsiFile;
import com.intellij.psi.PsiMethod;
import com.intellij.psi.util.PsiTreeUtil;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Pure IntelliJ-model mapping step: changed NEW-file line ranges -> Java PSI methods.
 *
 * Kept separate from VCS I/O so it can be tested against the real IntelliJ PSI
 * implementation in a headless platform test.
 */
public final class ChangedMethodPsiMapper {
    private ChangedMethodPsiMapper() {}

    public static List<ChangedMethodItem> mapJavaMethods(
        String filePath,
        PsiFile psiFile,
        Document document,
        List<LineDiff.Range> changes
    ) {
        List<SymbolOverlap.SymbolRange> ranges = new ArrayList<>();
        Map<String, PsiMethod> keyed = new LinkedHashMap<>();

        for (PsiMethod method : PsiTreeUtil.findChildrenOfType(psiFile, PsiMethod.class)) {
            int startOffset = method.getTextRange().getStartOffset();
            int endOffset = Math.max(startOffset, method.getTextRange().getEndOffset() - 1);
            int startLine = document.getLineNumber(startOffset) + 1;
            int endLine = document.getLineNumber(endOffset) + 1;
            String key = method.getName() + "@" + startOffset;
            keyed.put(key, method);
            ranges.add(new SymbolOverlap.SymbolRange(key, startLine, endLine));
        }

        List<ChangedMethodItem> items = new ArrayList<>();
        for (SymbolOverlap.SymbolRange touched : SymbolOverlap.changedSymbols(ranges, changes)) {
            PsiMethod method = keyed.get(touched.name());
            if (method == null) continue;
            items.add(new ChangedMethodItem(
                filePath,
                method.getName(),
                method.getTextRange().getStartOffset(),
                method.getTextRange().getEndOffset(),
                touched.startLine(),
                touched.endLine()
            ));
        }
        return items;
    }
}
