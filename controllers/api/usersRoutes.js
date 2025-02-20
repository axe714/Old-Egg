const router = require('express').Router();
const { Users, Carts } = require('../../models');
const bcrypt = require('bcrypt');
const { create } = require('../../models/Users');
const loggedIn = require('../../utils/auth');

//end point of /api/users routes

router.get('/', async (req, res) => {
  try {
    const usersData = await Users.findAll({
      //this parameter will include all associated tables, as well as nested tables
      include: [{ all: true, nested: true }],
    });
    res.status(200).json(usersData);
  } catch (err) {
    return res.status(500).json(err);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userById = await Users.findByPk(req.params.id, {
      include: [{ all: true, nested: true }],
    });
    if (!userById) {
      return res.status(404).json({
        message: 'This user ID does not exist. Please enter a valid user ID!',
      });
    }
    res.status(200).json(userById);
  } catch (err) {
    return res.status(500).json(err);
  }
});

router.post('/', async (req, res) => {
  try {
    const createUser = await Users.create({
      username: req.body.username,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      password: req.body.password,
      cart_id: req.body.cart_id,
      balance: req.body.balance,
    });
    res.json('Success')
  } catch (err) {
    const [error] = err.errors.map(error => {
      return {
        message: error.message,
        key: error.validatorKey,
        args: error.validatorArgs,
      }
    })

    switch (error.key) {
      case 'len':
        // In this case we only have the length sequelize argument for the password
        // If change later must change this too.
        const [num] = error.args
        res.status(400).json(`Password must be ${num} or more characters.`)
        break;
      case 'not_unique':
        const message = (error.message && error.message[0].toUpperCase() + error.message.slice(1) + '.') || ''
        res.status(400).json(message)
        break;
      case 'isEmail':
        res.status(400).json('Please enter a valid email.')
        break;
      default:
        res.status(400).json('Unable to post user data. ')
    }
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleteUser = await Users.destroy({
      where: { user_id: req.params.id },
    });
    if (!deleteUser) {
      return res.status(404).json({
        message: 'This user ID does not exist. Please enter a valid user ID!',
      });
    }
    res.status(200).json(deleteUser);
  } catch (err) {
    return res.status(500).json(err);
  }
});

// backend for logging in
router.post('/login', async (req, res) => {
  try {
    // Find the user who matches the posted e-mail address
    const userData = await Users.findOne({ where: { email: req.body.email } });

    if (!userData) {
      res
        .status(400)
        .json({ message: 'Email is not registered.' });
      return;
    }

    // Verify the posted password with the password store in the database
    const validPassword = await bcrypt.compare(
      req.body.password,
      userData.password
    );

    if (!validPassword) {
      res
        .status(400)
        .json({ message: 'Incorrect email or password, please try again' });
      return;
    }

    const dbCartData = await Carts.findAll({
      where: { user_id: userData.user_id }
    })
    const carts = dbCartData.map(
      (product) => product.get({ plain: true })
    );
    console.log(carts.length)
    // Create session variables based on the logged in user
    req.session.save(() => {

      req.session.user_id = userData.user_id;
      req.session.logged_in = true;
      req.session.cart_count = carts.length;

      res.json({ user: userData, message: 'You are now logged in!' });
    });
  } catch (err) {
    res.status(400).json(err);
  }
});

router.post('/logout', (req, res) => {
  if (req.session.logged_in) {
    req.session.destroy(() => {
      res.status(204).end();
    });
  } else {
    res.status(404).end();
  }
});

// PUT Update user information
router.put('/', loggedIn, async (req, res) => {
  try {
    const singleUser = await Users.findOne({
      where: {
        user_id: req.session.user_id
      }
    });

    await singleUser.update(
      {
        // username: req.body.username,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: req.body.password,
      });
    res.status(200).json('User updated!');
  } catch (err) {
    const [error] = err.errors.map(error => {
      return {
        message: error.message,
        key: error.validatorKey,
        args: error.validatorArgs,
      }
    })

    switch (error.key) {
      case 'len':
        // In this case we only have the length sequelize argument for the password
        // If change later must change this too.
        const [num] = error.args;
        res.status(400).json(`Password must be ${num} or more characters.`);
        break;
      case 'not_unique':
        const message = (error.message && error.message[0].toUpperCase() + error.message.slice(1) + '.') || ''
        res.status(400).json(message)
        break;
      case 'isEmail':
        res.status(400).json('Please enter a valid email.');
        break;
      default:
        res.status(400).json('Unable to post user data. ');
    }
  }
});

module.exports = router;
