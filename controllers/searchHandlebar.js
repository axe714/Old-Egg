const router = require('express').Router();
const { Categories, Products } = require('../models');
const { Op } = require('sequelize');


//end point of /search
router.get('/search/:product_searched', async (req, res) => {
  try {
    const productSearch = await Products.findAll({
      include: [{ model: Categories }],
      where: {
        [Op.or]: [
          {
            product_name: {
              [Op.like]: `%${req.params.product_searched}%`,
            },
          },
          {
            description: {
              [Op.like]: `%${req.params.product_searched}%`,
            },
          },
        ],
      },
    });
    const products = productSearch.map((product) =>
      product.get({ plain: true })
    );
    console.log('THIS IS PRODUCTS =-====', products);
    // If no products are found, redirect to 404 page
    if (products.length === 0) {
      res.redirect('/');
    }
    res.render('searchPage', {
      products,

      // Product Category
      productCategory: products[0].category.category_name,
      logged_in: req.session.logged_in
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

module.exports = router;
