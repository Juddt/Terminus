# TD 1 calibration - Algorithme de Newton-Raphson
# Exemple : trouver le zéro de f(x) = exp(x) - 2

import math


def newton_raphson(f, df, x0, tol=1e-10, max_iter=100):
    """
    Cherche x tel que f(x) = 0, en partant de x0.

    f        : la fonction dont on cherche le zéro
    df       : la dérivée de f
    x0       : le point de départ
    tol      : la précision voulue (on s'arrête quand |f(x)| < tol)
    max_iter : nombre maximum d'itérations (pour ne pas boucler à l'infini)
    """
    x = x0
    for i in range(max_iter):
        fx = f(x)
        print(f"Itération {i} : x = {x:.12f}   f(x) = {fx:.3e}")

        # 1) Est-ce qu'on est assez proche de zéro ?
        if abs(fx) < tol:
            return x

        # 2) On ne peut pas diviser par zéro (tangente horizontale)
        dfx = df(x)
        if dfx == 0:
            raise ZeroDivisionError("Dérivée nulle : la méthode ne peut pas continuer.")

        # 3) La formule de Newton : on suit la tangente jusqu'à l'axe des x
        x = x - fx / dfx

    raise RuntimeError("Pas de convergence après max_iter itérations.")


# ---- La fonction du TD et sa dérivée ----
def f(x):
    return math.exp(x) - 2


def df(x):
    return math.exp(x)  # la dérivée de exp(x) - 2 est exp(x)


if __name__ == "__main__":
    racine = newton_raphson(f, df, x0=1.0)
    print("\nZéro trouvé :", racine)
    print("Valeur exacte ln(2) :", math.log(2))
