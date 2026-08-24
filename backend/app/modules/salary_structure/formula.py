"""
Safe formula evaluator for Salary Component formulas like "base*0.1" or
"(base - 10000) * 0.05". Deliberately does NOT use Python's eval() -
walks the parsed AST and only allows numeric constants, whitelisted
variable names, and +, -, *, / operators. Verified against common
injection patterns (__import__, comprehensions with __class__ traversal,
statement-chaining) - all correctly rejected.
"""
import ast
import operator

from app.core.exceptions import BadRequestError

ALLOWED_OPERATORS = {
    ast.Add: operator.add, ast.Sub: operator.sub,
    ast.Mult: operator.mul, ast.Div: operator.truediv,
    ast.USub: operator.neg, ast.UAdd: operator.pos,
}


def safe_eval_formula(formula: str, variables: dict) -> float:
    try:
        tree = ast.parse(formula, mode="eval")
    except SyntaxError:
        raise BadRequestError(f"Invalid formula syntax: '{formula}'")

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        elif isinstance(node, ast.Constant):
            if not isinstance(node.value, (int, float)):
                raise BadRequestError("Only numbers are allowed in formulas")
            return node.value
        elif isinstance(node, ast.Name):
            if node.id not in variables:
                raise BadRequestError(f"Unknown variable '{node.id}' in formula - available: {list(variables.keys())}")
            return variables[node.id]
        elif isinstance(node, ast.BinOp):
            op = ALLOWED_OPERATORS.get(type(node.op))
            if not op:
                raise BadRequestError("Unsupported operator in formula - only + - * / allowed")
            return op(_eval(node.left), _eval(node.right))
        elif isinstance(node, ast.UnaryOp):
            op = ALLOWED_OPERATORS.get(type(node.op))
            if not op:
                raise BadRequestError("Unsupported operator in formula")
            return op(_eval(node.operand))
        else:
            raise BadRequestError(f"Unsupported expression in formula (type: {type(node).__name__})")

    return _eval(tree)
