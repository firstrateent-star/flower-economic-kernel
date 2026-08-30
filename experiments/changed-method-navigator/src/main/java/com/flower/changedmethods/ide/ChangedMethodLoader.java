package com.flower.changedmethods.ide;

import com.flower.changedmethods.core.LineDiff;
import com.flower.changedmethods.core.SymbolOverlap;
import com.intellij.openapi.application.ReadAction;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vcs.VcsException;
import com.intellij.openapi.vcs.changes.Change;
import com.intellij.openapi.vcs.changes.ChangeListManager;
import com.intellij.openapi.vcs.changes.ContentRevision;
import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.psi.PsiDocumentManager;
import com.intellij.psi.PsiFile;
import com.intellij.psi.PsiManager;
import com.intellij.psi.PsiMethod;
import com.intellij.psi.util.PsiTreeUtil;

import java.util.*;

public final class ChangedMethodLoader {
    private ChangedMethodLoader() {}
    private record RevisionSnapshot(String path, String oldText, String newText) {}

    public static List<ChangedMethodItem> loadJavaChangedMethods(Project project) {
        List<RevisionSnapshot> snapshots = new ArrayList<>();
        for (Change change : ChangeListManager.getInstance(project).getAllChanges()) {
            ContentRevision after = change.getAfterRevision();
            if (after == null) continue;
            try {
                ContentRevision before = change.getBeforeRevision();
                snapshots.add(new RevisionSnapshot(after.getFile().getPath(), before == null ? "" : nullToEmpty(before.getContent()), nullToEmpty(after.getContent())));
            } catch (VcsException ignored) {}
        }

        List<ChangedMethodItem> out = new ArrayList<>();
        for (RevisionSnapshot snapshot : snapshots) {
            List<LineDiff.Range> changes = LineDiff.changedNewLineRanges(snapshot.oldText(), snapshot.newText());
            if (changes.isEmpty()) continue;
            VirtualFile file = LocalFileSystem.getInstance().refreshAndFindFileByPath(snapshot.path());
            if (file == null) continue;

            List<ChangedMethodItem> mapped = ReadAction.compute(() -> {
                PsiFile psiFile = PsiManager.getInstance(project).findFile(file);
                if (psiFile == null) return List.of();
                Document document = PsiDocumentManager.getInstance(project).getDocument(psiFile);
                if (document == null) return List.of();

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
                    items.add(new ChangedMethodItem(snapshot.path(), method.getName(), method.getTextRange().getStartOffset(), method.getTextRange().getEndOffset(), touched.startLine(), touched.endLine()));
                }
                return items;
            });
            out.addAll(mapped);
        }
        out.sort(Comparator.comparing(ChangedMethodItem::filePath).thenComparingInt(ChangedMethodItem::startLine));
        return out;
    }

    private static String nullToEmpty(String value) { return value == null ? "" : value; }
}
