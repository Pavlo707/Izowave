import styled, { keyframes } from 'styled-components';

import { INTERFACE_MOBILE_BREAKPOINT } from '~const/interface';
import { InterfaceFont, InterfaceBackgroundColor } from '~type/interface';

const animationOpacity = keyframes`
  0% { opacity: 0 }
  100% { opacity: 1 }
`;

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const Item = styled.div`
  padding: 10px 13px;
  border-radius: 5px;
  color: #fff;
  text-transform: uppercase;
  font-family: ${InterfaceFont.PIXEL_TEXT};
  font-size: 12px;
  line-height: 12px;
  letter-spacing: 2px;
  animation: ${animationOpacity} 0.2s ease-in;
  background: ${InterfaceBackgroundColor.ERROR_TRANSPARENT_75};
  display: flex;
  align-items: center;
  @media ${INTERFACE_MOBILE_BREAKPOINT} {
    font-size: 11px;
    line-height: 11px;
    padding: 7px 11px 8px 11px;
  }
`;

export const Icon = styled.img`
  width: 16px;
  margin-right: 10px;
`;
