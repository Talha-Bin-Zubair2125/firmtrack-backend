const cronAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  next();
};

module.exports = cronAuth;
