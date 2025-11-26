export const isManager = (req, res, next) => {
  if (req.user.role !== "MANAGER") {
    return res.status(403).json({ error: "Only managers can access this" });
  }
  next();
};

export const isEmployee = (req, res, next) => {
  if (req.user.role !== "EMPLOYEE") {
    return res.status(403).json({ error: "Only employees can access this" });
  }
  next();
};
