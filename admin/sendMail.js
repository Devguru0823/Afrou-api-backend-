const { sendEmail } = require("../_helpers/email-handler");
const router = require("express").Router();

router.post("/send", async (req, res, next) => {
  try {
    let email = req.body.email;
    let subject = req.body.title;
    let message = req.body.description;
    let userData = { user_id: req.body?.user_id ?? 0 };
    await sendEmail(email,subject,message,userData,true);
    res.send({status:true})
  } catch (error) {
      console.log(error)
      next(error)
  }
});


module.exports = router