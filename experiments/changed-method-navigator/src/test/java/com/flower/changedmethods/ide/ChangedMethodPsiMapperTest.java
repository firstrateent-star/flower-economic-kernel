package com.flower.changedmethods.ide;

import com.flower.changedmethods.core.LineDiff;
import com.intellij.openapi.editor.Document;
import com.intellij.psi.PsiDocumentManager;
import com.intellij.psi.PsiFile;
import com.intellij.testFramework.fixtures.LightJavaCodeInsightFixtureTestCase;

import java.util.List;

public class ChangedMethodPsiMapperTest extends LightJavaCodeInsightFixtureTestCase {

    public void testMapsRealJavaPsiToOnlyChangedMethod() {
        String oldText = """
            class CheckoutService {
                int total(int[] values) {
                    return values.length;
                }

                int applyDiscount(int total) {
                    int discount = 10;
                    return total - discount;
                }

                void receipt(int total) {
                    System.out.println(total);
                }
            }
            """;

        String newText = """
            class CheckoutService {
                int total(int[] values) {
                    return values.length;
                }

                int applyDiscount(int total) {
                    int discount = 15;
                    return total - discount;
                }

                void receipt(int total) {
                    System.out.println(total);
                }
            }
            """;

        PsiFile psiFile = myFixture.configureByText("CheckoutService.java", newText);
        Document document = PsiDocumentManager.getInstance(getProject()).getDocument(psiFile);
        assertNotNull(document);

        List<ChangedMethodItem> items = ChangedMethodPsiMapper.mapJavaMethods(
            "CheckoutService.java",
            psiFile,
            document,
            LineDiff.changedNewLineRanges(oldText, newText)
        );

        assertEquals(1, items.size());
        assertEquals("applyDiscount", items.getFirst().methodName());
    }

    public void testNoChangeProducesNoChangedMethods() {
        String source = """
            class Demo {
                void one() {}
                void two() {}
            }
            """;

        PsiFile psiFile = myFixture.configureByText("Demo.java", source);
        Document document = PsiDocumentManager.getInstance(getProject()).getDocument(psiFile);
        assertNotNull(document);

        List<ChangedMethodItem> items = ChangedMethodPsiMapper.mapJavaMethods(
            "Demo.java",
            psiFile,
            document,
            LineDiff.changedNewLineRanges(source, source)
        );

        assertTrue(items.isEmpty());
    }
}
