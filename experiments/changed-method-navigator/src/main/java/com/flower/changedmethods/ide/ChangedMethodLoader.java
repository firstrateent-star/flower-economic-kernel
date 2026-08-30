package com.flower.changedmethods.ide;

import com.flower.changedmethods.core.LineDiff;
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

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

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
                snapshots.add(new RevisionSnapshot(
                    after.getFile().getPath(),
                    before == null ? "" : nullToEmpty(before.getContent()),
                    nullToEmpty(after.getContent())
                ));
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
                return ChangedMethodPsiMapper.mapJavaMethods(snapshot.path(), psiFile, document, changes);
            });
            out.addAll(mapped);
        }

        out.sort(Comparator.comparing(ChangedMethodItem::filePath).thenComparingInt(ChangedMethodItem::startLine));
        return out;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
