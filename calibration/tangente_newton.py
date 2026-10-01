import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BLUE, ORANGE, AQUA = "#2a78d6", "#eb6834", "#1baf7a"
INK, MUTED, GRID = "#1f1f1e", "#6b6a63", "#e4e3dc"

f = lambda x: math.exp(x) - 2
x0 = 1.0
pente = math.exp(x0)               # f'(x0)
x1 = x0 - f(x0) / pente            # là où la tangente coupe l'axe

xs = [i / 200 for i in range(-60, 321)]  # -0.3 .. 1.6
fig, ax = plt.subplots(figsize=(9, 6), dpi=130)
ax.axhline(0, color=MUTED, lw=1)
ax.grid(color=GRID, lw=0.8)
for s in ax.spines.values():
    s.set_visible(False)

ax.plot(xs, [f(x) for x in xs], color=BLUE, lw=2.5, label="La courbe  f(x) = exp(x) − 2")
tx = [0.45, 1.45]
ax.plot(tx, [f(x0) + pente * (x - x0) for x in tx], color=ORANGE, lw=2,
        label="La tangente au point x₀ = 1 (droite qui « touche » la courbe)")

ax.plot([x0], [f(x0)], "o", ms=10, color=ORANGE, mec="white", mew=2, zorder=5)
ax.plot([x0, x0], [0, f(x0)], ls=":", color=MUTED)
ax.plot([x1], [0], "o", ms=10, color=ORANGE, mec="white", mew=2, zorder=5)
ax.plot([math.log(2)], [0], "*", ms=16, color=AQUA, mec="white", zorder=6,
        label="Le vrai zéro : ln(2) ≈ 0,693")

ax.annotate("① On part de x₀ = 1\n    point (1 ; 0,718)", (x0, f(x0)), (1.12, 0.35),
            color=INK, fontsize=11, arrowprops=dict(arrowstyle="->", color=MUTED))
ax.annotate("② La tangente coupe l'axe ici :\n    x₁ = 0,736  → nouveau point",
            (x1, 0), (0.78, -0.9), color=INK, fontsize=11,
            arrowprops=dict(arrowstyle="->", color=MUTED))
ax.annotate("③ x₁ est déjà tout près\n    du vrai zéro !", (math.log(2), 0), (-0.25, 0.6),
            color=INK, fontsize=11, arrowprops=dict(arrowstyle="->", color=MUTED))

ax.set_xlim(-0.3, 1.6); ax.set_ylim(-1.5, 3)
ax.set_xlabel("x", color=MUTED); ax.set_ylabel("f(x)", color=MUTED)
ax.tick_params(colors=MUTED)
ax.set_title("Newton-Raphson : une étape, vue sur le dessin", color=INK, fontsize=14, loc="left")
ax.legend(loc="upper left", frameon=False, fontsize=10, labelcolor=INK)
fig.tight_layout()
fig.savefig("tangente_newton.png")
