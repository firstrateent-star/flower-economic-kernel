package com.flower.changedmethods.ide;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.fileEditor.OpenFileDescriptor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowFactory;
import com.intellij.ui.content.Content;
import com.intellij.ui.content.ContentFactory;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;
import java.awt.*;
import java.util.List;

public final class ChangedMethodsToolWindowFactory implements ToolWindowFactory {
    @Override
    public void createToolWindowContent(@NotNull Project project, @NotNull ToolWindow toolWindow) {
        JPanel panel = new JPanel(new BorderLayout(8, 8));
        DefaultListModel<ChangedMethodItem> model = new DefaultListModel<>();
        JList<ChangedMethodItem> list = new JList<>(model);
        JButton refresh = new JButton("Refresh");
        panel.add(refresh, BorderLayout.NORTH);
        panel.add(new JScrollPane(list), BorderLayout.CENTER);

        Runnable reload = () -> {
            refresh.setEnabled(false);
            ApplicationManager.getApplication().executeOnPooledThread(() -> {
                List<ChangedMethodItem> items = ChangedMethodLoader.loadJavaChangedMethods(project);
                ApplicationManager.getApplication().invokeLater(() -> {
                    model.clear();
                    for (ChangedMethodItem item : items) model.addElement(item);
                    refresh.setEnabled(true);
                });
            });
        };
        refresh.addActionListener(e -> reload.run());
        list.addListSelectionListener(e -> {
            if (e.getValueIsAdjusting()) return;
            ChangedMethodItem item = list.getSelectedValue();
            if (item == null) return;
            VirtualFile file = LocalFileSystem.getInstance().findFileByPath(item.filePath());
            if (file != null) new OpenFileDescriptor(project, file, item.startOffset()).navigate(true);
        });

        Content content = ContentFactory.getInstance().createContent(panel, "", false);
        toolWindow.getContentManager().addContent(content);
        reload.run();
    }
}
