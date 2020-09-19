/* eslint-disable no-console */

import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Hidden from "@material-ui/core/Hidden";
import { makeStyles } from "@material-ui/core/styles";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import CardMenu from "@saleor/components/CardMenu";
import CardTitle from "@saleor/components/CardTitle";
import Checkbox from "@saleor/components/Checkbox";
import LinkChoice from "@saleor/components/LinkChoice";
import Money from "@saleor/components/Money";
import ResponsiveTable from "@saleor/components/ResponsiveTable";
import { SingleAutocompleteChoiceType } from "@saleor/components/SingleAutocompleteSelectField";
import Skeleton from "@saleor/components/Skeleton";
import TableHead from "@saleor/components/TableHead";
import { ProductVariant_costPrice } from "@saleor/fragments/types/ProductVariant";
import useNotifier from "@saleor/hooks/useNotifier";
import { useProductVariantSetDefaultMutation } from "@saleor/products/mutations";
import { getProductErrorMessage } from "@saleor/utils/errors";
import React from "react";
import { FormattedMessage, IntlShape, useIntl } from "react-intl";

import { maybe, renderCollection } from "../../../misc";
import { ListActions } from "../../../types";
import {
  ProductDetails_product_variants,
  ProductDetails_product_variants_stocks_warehouse
} from "../../types/ProductDetails";

function getWarehouseChoices(
  variants: ProductDetails_product_variants[],
  intl: IntlShape
): SingleAutocompleteChoiceType[] {
  return [
    {
      label: intl.formatMessage({
        defaultMessage: "All Warehouses",
        description: "filtering option"
      }),
      value: null
    },
    ...variants
      .reduce<ProductDetails_product_variants_stocks_warehouse[]>(
        (warehouses, variant) => [
          ...warehouses,
          ...variant.stocks.reduce<
            ProductDetails_product_variants_stocks_warehouse[]
          >((variantStocks, stock) => {
            if (!!warehouses.find(w => w.id === stock.warehouse.id)) {
              return variantStocks;
            }

            return [...variantStocks, stock.warehouse];
          }, [])
        ],
        []
      )
      .map(w => ({
        label: w.name,
        value: w.id
      }))
  ];
}

const useStyles = makeStyles(
  theme => ({
    [theme.breakpoints.up("lg")]: {
      colActions: {
        width: 30
      },
      colInventory: {
        width: 270
      },
      colName: {},
      colPrice: {
        width: 150
      },
      colSku: {
        width: 200
      }
    },
    colInventory: {
      textAlign: "right"
    },
    colName: {},
    colPrice: {
      textAlign: "right"
    },
    colSku: {},
    colStatus: {},
    denseTable: {
      "& td, & th": {
        paddingRight: theme.spacing(3)
      }
    },
    link: {
      cursor: "pointer"
    },
    select: {
      display: "inline-block"
    },
    textLeft: {
      textAlign: "left" as "left"
    },
    textRight: {
      textAlign: "right" as "right"
    },
    warehouseLabel: {
      display: "inline-block",
      marginRight: theme.spacing()
    },
    warehouseSelectContainer: {
      paddingTop: theme.spacing(2)
    }
  }),
  { name: "ProductVariants" }
);

function getAvailabilityLabel(
  intl: IntlShape,
  warehouse: string,
  variant: ProductDetails_product_variants,
  numAvailable: number
): string {
  const variantStock = variant.stocks.find(s => s.warehouse.id === warehouse);

  if (!!warehouse) {
    if (!!variantStock) {
      if (variantStock.quantity > 0) {
        return intl.formatMessage(
          {
            defaultMessage:
              "{stockQuantity,plural,one{{stockQuantity} available} other{{stockQuantity} available}}",
            description: "product variant inventory"
          },
          {
            stockQuantity: variantStock.quantity
          }
        );
      } else {
        return intl.formatMessage({
          defaultMessage: "Unavailable",
          description: "product variant inventory"
        });
      }
    } else {
      return intl.formatMessage({
        defaultMessage: "Not stocked",
        description: "product variant inventory"
      });
    }
  } else {
    if (numAvailable > 0) {
      return intl.formatMessage(
        {
          defaultMessage:
            "{numLocations,plural,one{{numAvailable} available at {numLocations} location} other{{numAvailable} available at {numLocations} locations}}",
          description: "product variant inventory"
        },
        {
          numAvailable,
          numLocations: variant.stocks.length
        }
      );
    } else {
      return intl.formatMessage({
        defaultMessage: "Unavailable in all locations",
        description: "product variant inventory"
      });
    }
  }
}

interface ProductVariantsProps extends ListActions {
  disabled: boolean;
  productId: string;
  variants: ProductDetails_product_variants[];
  fallbackPrice?: ProductVariant_costPrice;
  onRowClick: (id: string) => () => void;
  onVariantAdd?();
  onVariantsAdd?();
}

const numberOfColumns = 5;

export const ProductVariants: React.FC<ProductVariantsProps> = props => {
  const {
    disabled,
    variants,
    productId,
    fallbackPrice,
    onRowClick,
    onVariantAdd,
    onVariantsAdd,
    isChecked,
    selected,
    toggle,
    toggleAll,
    toolbar
  } = props;
  const classes = useStyles(props);

  const intl = useIntl();
  const [warehouse, setWarehouse] = React.useState<string>(null);
  const hasVariants = maybe(() => variants.length > 0, true);

  return (
    <Card>
      <CardTitle
        title={intl.formatMessage({
          defaultMessage: "Variants",
          description: "section header"
        })}
        toolbar={
          hasVariants ? (
            <Button
              onClick={onVariantAdd}
              variant="text"
              color="primary"
              data-test="button-add-variant"
            >
              <FormattedMessage
                defaultMessage="Create variant"
                description="button"
              />
            </Button>
          ) : (
            <Button
              onClick={onVariantsAdd}
              variant="text"
              color="primary"
              data-test="button-add-variants"
            >
              <FormattedMessage
                defaultMessage="Create variants"
                description="button"
              />
            </Button>
          )
        }
      />

      {variants.length > 0 ? (
        <CardContent className={classes.warehouseSelectContainer}>
          <Typography className={classes.warehouseLabel}>
            <FormattedMessage
              defaultMessage="Available inventory at:"
              description="variant stock status"
            />
          </Typography>
          <LinkChoice
            className={classes.select}
            choices={getWarehouseChoices(variants, intl)}
            name="warehouse"
            value={warehouse}
            onChange={event => setWarehouse(event.target.value)}
          />
        </CardContent>
      ) : (
        <CardContent>
          <Typography color={hasVariants ? "textPrimary" : "textSecondary"}>
            <FormattedMessage defaultMessage="Use variants for products that come in a variety of versions for example different sizes or colors" />
          </Typography>
        </CardContent>
      )}
      {hasVariants && (
        <ResponsiveTable className={classes.denseTable}>
          <TableHead
            colSpan={numberOfColumns}
            selected={selected}
            disabled={disabled}
            items={variants}
            toggleAll={toggleAll}
            toolbar={toolbar}
          >
            <TableCell className={classes.colName}>
              <FormattedMessage
                defaultMessage="Variant"
                description="product variant name"
              />
            </TableCell>
            <TableCell className={classes.colSku}>
              <FormattedMessage defaultMessage="SKU" />
            </TableCell>
            <Hidden smDown>
              <TableCell className={classes.colPrice}>
                <FormattedMessage
                  defaultMessage="Price"
                  description="product variant price"
                />
              </TableCell>
            </Hidden>
            <TableCell className={classes.colInventory}>
              <FormattedMessage
                defaultMessage="Inventory"
                description="product variant inventory status"
              />
            </TableCell>
            <TableCell className={classes.colActions}></TableCell>
          </TableHead>
          <TableBody>
            {renderCollection(variants, variant => {
              const isSelected = variant ? isChecked(variant.id) : false;
              const numAvailable =
                variant && variant.stocks
                  ? variant.stocks.reduce(
                      (acc, s) => acc + s.quantity - s.quantityAllocated,
                      0
                    )
                  : null;

              const notify = useNotifier();

              const getProductVariantSetDefaultVariables = (
                productId: string,
                variantId: string
              ) => ({
                variables: {
                  productId,
                  variantId
                }
              });

              const [
                productVariantSetDefault
              ] = useProductVariantSetDefaultMutation({
                onCompleted: data => {
                  const errors = data.productVariantSetDefault.errors;
                  if (errors.length) {
                    errors.map(error =>
                      notify({
                        status: "error",
                        text: getProductErrorMessage(error, intl)
                      })
                    );
                  } else {
                    notify({
                      status: "success",
                      text: intl.formatMessage({
                        defaultMessage: "Default variant set successfully!"
                      })
                    });
                  }
                }
              });

              const onSetDefaultVariant = (variant, productId) => {
                productVariantSetDefault(
                  getProductVariantSetDefaultVariables(productId, variant.id)
                );
              };

              return (
                <TableRow
                  selected={isSelected}
                  hover={!!variant}
                  onClick={e => {
                    e.preventDefault();
                  }}
                  key={variant ? variant.id : "skeleton"}
                  className={classes.link}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      disabled={disabled}
                      disableClickPropagation
                      onChange={() => toggle(variant.id)}
                    />
                  </TableCell>
                  <TableCell className={classes.colName} data-test="name">
                    {variant ? variant.name || variant.sku : <Skeleton />}
                  </TableCell>
                  <TableCell className={classes.colSku} data-test="sku">
                    {variant ? variant.sku : <Skeleton />}
                  </TableCell>
                  <Hidden smDown>
                    <TableCell className={classes.colPrice} data-test="price">
                      {variant ? (
                        variant.price ? (
                          <Money money={variant.price} />
                        ) : fallbackPrice ? (
                          <Money money={fallbackPrice} />
                        ) : (
                          <Skeleton />
                        )
                      ) : (
                        <Skeleton />
                      )}
                    </TableCell>
                  </Hidden>
                  <TableCell
                    className={classes.colInventory}
                    data-test="inventory"
                  >
                    {numAvailable === null ? (
                      <Skeleton />
                    ) : (
                      getAvailabilityLabel(
                        intl,
                        warehouse,
                        variant,
                        numAvailable
                      )
                    )}
                  </TableCell>
                  <TableCell className={classes.colActions} data-test="actions">
                    <CardMenu
                      menuItems={[
                        {
                          label: intl.formatMessage({
                            defaultMessage: "Set as default",
                            description: "set variant as default, button"
                          }),
                          onSelect: () =>
                            onSetDefaultVariant(variant, productId),
                          testId: "setDefault"
                        }
                      ]}
                      data-test="menu"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </ResponsiveTable>
      )}
    </Card>
  );
};
ProductVariants.displayName = "ProductVariants";
export default ProductVariants;
