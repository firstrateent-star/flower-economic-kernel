# First Reality Test — Revenue Path Sentinel

Goal: verify the private Nursery prototype inside a fresh Framer project without publishing anything or spending money.

## Human membrane

The only human work required for this test is local Framer access plus a terminal on the same computer. Do not publish to the Marketplace, connect payments, enter tax data, or buy anything yet.

## 1. Get the plugin folder locally

From the private repository, download or clone `firstrateent-star/flower-economic-kernel`, then open:

`nursery/revenue-path-sentinel`

## 2. Run it locally

In Terminal from that folder:

```bash
npm install
npm run dev
```

Leave the terminal window running.

Framer's current plugin docs recommend a modern Node.js version. If `node -v` is old or missing, install/update Node first.

## 3. Open the development plugin

1. Open Framer and create a fresh blank project.
2. In the Plugins area, enable **Developer Tools**.
3. Open the Plugins menu and choose **Open Development Plugin**.
4. Open **Revenue Path Sentinel**.

Expected result: a small window appears with a button labeled **Scan revenue paths**.

## 4. Plant two deterministic test faults

In the fresh project create two linked elements/layers and rename the linked layer so its name includes the stated intent phrase:

- `Buy now` → `https://example.com`
- `Checkout` → `http://example.com/checkout`

Then press **Scan revenue paths**.

Expected result:

- `Buy now` should be flagged as a critical test/example destination.
- `Checkout` should be flagged as a critical example/test destination and an insecure HTTP money link.
- High-intent links may also receive an untracked-CTA warning when they lack a Framer tracking ID.

Clicking a finding should select/focus the corresponding node.

## Stop conditions

Stop and send the exact error or a screenshot if any of these occur:

- `npm install` fails
- `npm run dev` fails
- Framer cannot see the development plugin
- plugin opens but Scan throws an error
- planted faults are not detected
- clicking a finding does not focus the node

Do not troubleshoot for more than one simple retry. The machine should absorb debugging burden.

## Pass condition

This reality test passes only if the plugin opens in a fresh project and catches the planted faults as intended.

After a pass, the machine can proceed to `npm run pack` and private package inspection. Public Marketplace submission, pricing, external checkout/payment setup, tax/KYC, or new terms are separate human approval boundaries.
